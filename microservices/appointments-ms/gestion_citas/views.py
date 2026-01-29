import requests  
import logging
from django.utils import timezone
from datetime import datetime, timedelta
from django.db import transaction 
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Max

# Importación de Modelos
from .models import Cita, NotaMedica, HistoricoCita, ConfiguracionGlobal

# Importación de Serializadores
from .serializers import (
    CitaSerializer, 
    NotaMedicaSerializer, 
    HistoricoCitaSerializer, 
    ConfiguracionGlobalSerializer
)

# URLs de Microservicios
PATIENTS_MS_URL = "http://patients-ms:8001/api/v1/pacientes/internal/bulk-info/"
STAFF_MS_URL = "http://professionals-ms:8002/api/v1/staff/internal/bulk-info/"
SERVICES_MS_URL = "http://professionals-ms:8002/api/v1/staff/servicios/internal/bulk-info/"
LUGARES_MS_URL = "http://professionals-ms:8002/api/v1/staff/lugares/internal/bulk-info/"

logger = logging.getLogger(__name__)

class ConfiguracionViewSet(viewsets.ModelViewSet):
    """
    Endpoint para que el Admin cambie las reglas (Singleton).
    Siempre devuelve la configuración ID=1.
    """
    queryset = ConfiguracionGlobal.objects.all()
    serializer_class = ConfiguracionGlobalSerializer
    
    def list(self, request, *args, **kwargs):
        obj, created = ConfiguracionGlobal.objects.get_or_create(pk=1)
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

class CitaViewSet(viewsets.ModelViewSet):
    """
    Gestión principal de Citas.
    Incluye lógica de negocio para AGENDAMIENTO, CANCELACIÓN y REPORTES.
    """
    queryset = Cita.objects.all().order_by('-fecha', '-hora_inicio')
    serializer_class = CitaSerializer

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]

    filterset_fields = [
        'fecha',           
        'paciente_id',     
        'profesional_id',  
        'estado',          
        'lugar_id'
    ]

    ordering_fields = ['fecha', 'hora_inicio']

    # --- REPORTE DE INASISTENCIAS (Para Frontend) ---
    @action(detail=False, methods=['get'], url_path='reportes/inasistencias')
    def reporte_inasistencias(self, request):
        config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)
        limite = config.limite_inasistencias
        
        data = (
            Cita.objects.filter(estado='NO_ASISTIO')
            .values('paciente_id')
            .annotate(
                total=Count('id'),
                ultima_falta=Max('fecha')
            )
        )

        resultado = {}
        for item in data:
            pid = str(item['paciente_id'])
            cantidad = item['total']
            ultima = item['ultima_falta']
            # Bloqueo preliminar (el frontend debe refinar con fecha de corte del paciente)
            bloqueado = (limite > 0) and (cantidad >= limite)
            
            resultado[pid] = {
                "inasistencias": cantidad,
                "ultima_falta": ultima,
                "bloqueado_por_inasistencias": bloqueado
            }
        return Response(resultado)

    # --- AGENDAR CITA (CREATE - CON PROTECCIÓN ATÓMICA) ---
    def create(self, request, *args, **kwargs):
        # Copia mutable para poder inyectar datos calculados (hora_fin)
        data = request.data.copy()
        
        paciente_id = data.get('paciente_id')
        fecha_solicitada = data.get('fecha')
        servicio_id = data.get('servicio_id')
        hora_inicio_str = data.get('hora_inicio')

        config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)

        print(f"\n🚀 --- INICIO VALIDACIÓN AGENDAMIENTO ---")
        
        # =====================================================================
        # 🔒 INICIO DE TRANSACCIÓN ATÓMICA
        # Todo lo que ocurra aquí dentro es "Todo o Nada".
        # Evita que dos usuarios agenden el mismo hueco al mismo tiempo.
        # =====================================================================
        try:
            with transaction.atomic():

                # ---------------------------------------------------------------------
                # 1. VALIDACIÓN DE BLOQUEO POR INASISTENCIAS
                # ---------------------------------------------------------------------
                if config.limite_inasistencias > 0:
                    fecha_corte = None
                    try:
                        # Consultamos fecha de desbloqueo al MS de Pacientes
                        url = f"http://patients-ms:8001/api/v1/pacientes/listado/{paciente_id}/" 
                        resp = requests.get(url, timeout=2) # Timeout corto para no bloquear la transacción
                        
                        if resp.status_code == 200:
                            p_data = resp.json()
                            f_str = p_data.get('ultima_fecha_desbloqueo')
                            if f_str:
                                if f_str.endswith('Z'): f_str = f_str.replace('Z', '+00:00')
                                fecha_corte = datetime.fromisoformat(f_str)
                    except Exception as e:
                        logger.error(f"Error consultando pacientes: {e}")

                    # Contamos faltas
                    query_inasistencias = Cita.objects.filter(paciente_id=paciente_id, estado='NO_ASISTIO')
                    
                    if fecha_corte:
                        # TRUCO: Filtro estricto (Mayor que). Perdonamos el día exacto del desbloqueo.
                        fecha_filtro = fecha_corte.date() 
                        query_inasistencias = query_inasistencias.filter(fecha__gt=fecha_filtro)

                    if query_inasistencias.count() >= config.limite_inasistencias:
                        return Response(
                            {"detalle": config.mensaje_bloqueo_inasistencia}, 
                            status=status.HTTP_403_FORBIDDEN
                        )

                # ---------------------------------------------------------------------
                # 1.5. VALIDACIÓN DE ANTELACIÓN MÍNIMA (LEAD TIME) - ¡NUEVO! ⏳
                # ---------------------------------------------------------------------
                try:
                    # Construimos el objeto datetime completo de la cita solicitada
                    fmt = '%H:%M:%S' if len(hora_inicio_str) > 5 else '%H:%M'
                    hora_parseada = datetime.strptime(hora_inicio_str, fmt).time()
                    fecha_parseada = datetime.strptime(fecha_solicitada, '%Y-%m-%d').date()
                    
                    cita_dt = datetime.combine(fecha_parseada, hora_parseada)
                    if timezone.is_naive(cita_dt):
                        cita_dt = timezone.make_aware(cita_dt)
                        
                    ahora = timezone.now()
                    
                    # REGLA: Mínimo 1 hora de antelación
                    margen_antelacion = timedelta(hours=1) 
                    
                    if cita_dt < (ahora + margen_antelacion):
                        return Response(
                            {"detalle": "Las citas deben agendarse con al menos 1 hora de antelación."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except ValueError:
                    return Response({"detalle": "Formato de fecha/hora inválido."}, status=status.HTTP_400_BAD_REQUEST)

                # ---------------------------------------------------------------------
                # 2. VALIDACIÓN DE OVERBOOKING (CRUCE DE HORARIOS) 🛡️
                # ---------------------------------------------------------------------
                # A. Obtener Duración del Servicio
                duracion = 20 # Default
                try:
                    if servicio_id:
                        url_srv = f"{SERVICES_MS_URL}?ids={servicio_id}"
                        resp_srv = requests.get(url_srv, timeout=2)
                        if resp_srv.status_code == 200:
                            d_srv = resp_srv.json()
                            if str(servicio_id) in d_srv:
                                duracion = d_srv[str(servicio_id)].get('duracion', 20)
                except: pass

                # B. Calcular Hora Fin
                try:
                    # Reusamos lógica de tiempo calculada o parseamos de nuevo si es necesario
                    # Aquí parseamos de nuevo para asegurar el cálculo de hora_fin
                    fmt = '%H:%M:%S' if len(hora_inicio_str) > 5 else '%H:%M'
                    h_ini_dt = datetime.strptime(hora_inicio_str, fmt)
                    h_fin_dt = h_ini_dt + timedelta(minutes=duracion)
                    
                    hora_ini_time = h_ini_dt.time()
                    hora_fin_time = h_fin_dt.time()
                    
                    # Inyectamos hora_fin calculada para guardarla
                    data['hora_fin'] = h_fin_dt.strftime('%H:%M:%S')
                except ValueError:
                    return Response({"detalle": "Formato de hora inválido"}, status=status.HTTP_400_BAD_REQUEST)

                # C. Verificar Cruce del MÉDICO (Con bloqueo de filas para concurrencia)
                # select_for_update() bloquea las filas encontradas hasta que termine la transacción.
                # Si no encuentra filas (agenda vacía), el atomic() protege la inserción concurrente.
                
                cruce_medico = Cita.objects.select_for_update().filter(
                    profesional_id=data.get('profesional_id'),
                    fecha=fecha_solicitada,
                    estado__in=['PENDIENTE', 'ACEPTADA', 'EN_SALA']
                ).filter(
                    # Lógica de solapamiento: (StartA < EndB) and (EndA > StartB)
                    hora_inicio__lt=hora_fin_time,
                    hora_fin__gt=hora_ini_time
                ).exists()

                if cruce_medico:
                    # Lanzamos respuesta directa (el return hace rollback implícito al salir del atomic)
                    return Response(
                        {"detalle": "El horario seleccionado ya no está disponible (Cruce con otra cita)."},
                        status=status.HTTP_409_CONFLICT
                    )

                # D. Verificar Cruce del PACIENTE (Bilocación)
                cruce_paciente = Cita.objects.filter(
                    paciente_id=paciente_id,
                    fecha=fecha_solicitada,
                    estado__in=['PENDIENTE', 'ACEPTADA', 'EN_SALA']
                ).filter(
                    hora_inicio__lt=hora_fin_time,
                    hora_fin__gt=hora_ini_time
                ).exists()

                if cruce_paciente:
                    return Response(
                        {"detalle": "El paciente ya tiene otra cita médica agendada en este horario."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # ---------------------------------------------------------------------
                # 3. LÍMITES DIARIOS
                # ---------------------------------------------------------------------
                citas_dia = Cita.objects.filter(
                    paciente_id=paciente_id, fecha=fecha_solicitada
                ).exclude(estado__in=['CANCELADA', 'NO_ASISTIO', 'RECHAZADA'])

                if citas_dia.count() >= config.max_citas_dia_paciente:
                    return Response({"detalle": "Límite diario de citas alcanzado."}, status=status.HTTP_400_BAD_REQUEST)

                if not config.permitir_mismo_servicio_dia:
                    if citas_dia.filter(servicio_id=servicio_id).exists():
                        return Response({"detalle": "Ya tiene una cita para este servicio hoy."}, status=status.HTTP_400_BAD_REQUEST)

                # ---------------------------------------------------------------------
                # 4. GUARDADO FINAL
                # ---------------------------------------------------------------------
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                headers = self.get_success_headers(serializer.data)
                
                print("🟢 CITA CREADA EXITOSAMENTE")
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            # Captura errores inesperados para no romper el servidor con 500 feos
            logger.error(f"Error en transacción de cita: {e}")
            # Si el error vino de una Response interna, Django DRF lo manejará, pero si es python puro:
            return Response({"error": "Error procesando la solicitud."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # --- CANCELAR/MODIFICAR CITA ---
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        # Obtenemos fecha/hora actual con zona horaria
        ahora = timezone.now()
        
        # Construimos la fecha/hora de la cita
        try:
            fecha_cita = datetime.combine(instance.fecha, instance.hora_inicio)
            if timezone.is_naive(fecha_cita):
                fecha_cita = timezone.make_aware(fecha_cita)
        except Exception:
            fecha_cita = timezone.now() # Fallback por seguridad

        # --- VALIDACIÓN 1: ESTADOS FINALES (INMUTABILIDAD) ---
        # Si la cita ya terminó, no permitimos revivirla a menos que seas Admin (opcional)
        estados_finales = ['CANCELADA', 'NO_ASISTIO', 'REALIZADA']
        if instance.estado in estados_finales and nuevo_estado != instance.estado:
             return Response(
                {"detalle": f"No se puede modificar una cita que ya está en estado final: {instance.estado}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- VALIDACIÓN 2: LÓGICA DE TIEMPO PARA 'NO_ASISTIO' ---
        if nuevo_estado == 'NO_ASISTIO':
            # Regla: Solo puedes marcar falta si la cita YA PASÓ
            if fecha_cita > ahora:
                return Response(
                    {"detalle": "Error lógico: No puedes marcar 'No Asistió' en una cita futura. Usa 'Cancelar' si corresponde."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # --- VALIDACIÓN 3: LÓGICA DE TIEMPO PARA 'REALIZADA' ---
        if nuevo_estado == 'REALIZADA':
            # Regla: No puedes atender al paciente antes de que llegue la cita
            # (Damos un margen de 15 min antes por si llegan temprano)
            margen = ahora + timedelta(minutes=15)
            if fecha_cita > margen:
                return Response(
                    {"detalle": "No puedes finalizar una cita que aún no ha comenzado."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # --- VALIDACIÓN 4: CANCELACIÓN TARDÍA ---
        if nuevo_estado == 'CANCELADA':
            config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)
            horas_limite = config.horas_antelacion_cancelar
            
            # Si la cita ya pasó, no se cancela, se marca como No Asistió o Realizada
            if ahora > fecha_cita:
                 return Response(
                    {"detalle": "La cita ya pasó. No se puede cancelar, marque como Realizada o No Asistió."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            diferencia = fecha_cita - ahora
            horas_restantes = diferencia.total_seconds() / 3600

            if horas_restantes < horas_limite:
                return Response(
                    {
                        "error": "Validación de negocio fallida",
                        "detalle": config.mensaje_notificacion_cancelacion or f"Mínimo {horas_limite}h de antelación.",
                        "horas_faltantes": round(horas_restantes, 1)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        return super().update(request, *args, **kwargs)
    
    # --- LISTADO ENRIQUECIDO ---
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        
        if isinstance(response.data, dict) and 'results' in response.data:
            data = response.data['results']
            paginated = True
        else:
            data = response.data
            paginated = False
        
        data_enriquecida = self._enrich_data(data)
        
        if paginated:
            response.data['results'] = data_enriquecida
        else:
            response.data = data_enriquecida
            
        return response

    def _enrich_data(self, citas):
        if not citas: return citas

        ids = {'paciente': set(), 'profesional': set(), 'servicio': set(), 'lugar': set()}
        
        for c in citas:
            if c.get('paciente_id'): ids['paciente'].add(str(c['paciente_id']))
            if c.get('profesional_id'): ids['profesional'].add(str(c['profesional_id']))
            if c.get('servicio_id'): ids['servicio'].add(str(c['servicio_id']))
            if c.get('lugar_id'): ids['lugar'].add(str(c['lugar_id']))

        def fetch_bulk(url, id_set):
            if not id_set: return {}
            try:
                resp = requests.get(f"{url}?ids={','.join(id_set)}", timeout=2)
                return resp.json() if resp.status_code == 200 else {}
            except Exception as e:
                logger.error(f"Error bulk {url}: {e}")
                return {}

        info_pacientes = fetch_bulk(PATIENTS_MS_URL, ids['paciente'])
        info_profesionales = fetch_bulk(STAFF_MS_URL, ids['profesional'])
        info_servicios = fetch_bulk(SERVICES_MS_URL, ids['servicio'])
        info_lugares = fetch_bulk(LUGARES_MS_URL, ids['lugar'])

        for c in citas:
            p_id = str(c.get('paciente_id'))
            c['paciente_nombre'] = info_pacientes.get(p_id, {}).get('nombre_completo', 'Desconocido')
            c['paciente_doc'] = info_pacientes.get(p_id, {}).get('numero_documento', 'N/A')

            prof_id = str(c.get('profesional_id'))
            c['profesional_nombre'] = info_profesionales.get(prof_id, {}).get('nombre', 'No asignado')

            srv_id = str(c.get('servicio_id'))
            c['servicio_nombre'] = info_servicios.get(srv_id, {}).get('nombre', 'No especificado')

            lug_id = str(c.get('lugar_id'))
            c['lugar_nombre'] = info_lugares.get(lug_id, {}).get('nombre', 'Sede Principal')

        return citas

class NotaMedicaViewSet(viewsets.ModelViewSet):
    queryset = NotaMedica.objects.all()
    serializer_class = NotaMedicaSerializer

class HistoricoCitaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoricoCita.objects.all().order_by('-fecha_registro')
    serializer_class = HistoricoCitaSerializer