import requests  
import logging
from django.utils import timezone
from datetime import datetime, timedelta
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

    # --- AGENDAR CITA (CREATE) ---
    def create(self, request, *args, **kwargs):
        data = request.data
        paciente_id = data.get('paciente_id')
        fecha_solicitada = data.get('fecha')
        servicio_id = data.get('servicio_id')

        config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)

        print(f"\n🚀 --- INICIO VALIDACIÓN AGENDAMIENTO ---")
        print(f"🧐 Paciente ID: {paciente_id} | Límite Configurado: {config.limite_inasistencias}")

        if config.limite_inasistencias > 0:
            fecha_corte = None
            try:
                # URL interna hacia Pacientes (Asegúrate que coincida con tu red Docker)
                url = f"http://patients-ms:8001/api/v1/pacientes/listado/{paciente_id}/" 
                print(f"📡 1. Consultando URL interna: {url}")
                
                resp = requests.get(url, timeout=3)
                print(f"📡 2. Respuesta Status Code: {resp.status_code}") 
                
                if resp.status_code == 200:
                    paciente_data = resp.json()
                    fecha_str = paciente_data.get('ultima_fecha_desbloqueo')
                    print(f"📅 3. Fecha 'ultima_fecha_desbloqueo' recibida: {fecha_str}")
                    
                    if fecha_str:
                        # Limpieza de formato ISO por si acaso
                        if fecha_str.endswith('Z'):
                            fecha_str = fecha_str.replace('Z', '+00:00')
                        fecha_corte = datetime.fromisoformat(fecha_str)
                        print(f"✅ 4. Fecha Corte Parseada Correctamente: {fecha_corte}")
                    else:
                        print("⚠️ El paciente existe pero NO tiene fecha de desbloqueo (es None)")
                else:
                    print(f"❌ ERROR: No se pudo obtener paciente. Body: {resp.text}")

            except Exception as e:
                print(f"🔥 EXCEPCIÓN CRÍTICA CONECTANDO A PACIENTES: {e}")

            # Consulta de Inasistencias
            query_inasistencias = Cita.objects.filter(
                paciente_id=paciente_id,
                estado='NO_ASISTIO'
            )
            
            total_historico = query_inasistencias.count()
            print(f"📊 5. Inasistencias Totales Históricas: {total_historico}")

            if fecha_corte:
                # TRUCO: Le sumamos 1 día a la fecha de corte para que el conteo empiece desde mañana.
                # Así, cualquier "No Asistió" de hoy (o antes) queda perdonado automáticamente.
                fecha_filtro = fecha_corte.date() # + timedelta(days=1) si quieres ser muy permisivo
                
                # Usamos __gt (Mayor que).
                # Si corte es 28/01. Buscamos citas > 28/01. Osea del 29 en adelante.
                query_inasistencias = query_inasistencias.filter(fecha__gt=fecha_filtro)
                print(f"🧹 6. Aplicando filtro ESTRICTO: Contar solo citas > {fecha_filtro}")

            conteo_inasistencias = query_inasistencias.count()
            print(f"🏁 7. CONTEO FINAL PARA VALIDACIÓN: {conteo_inasistencias}")

            if conteo_inasistencias >= config.limite_inasistencias:
                print("⛔ RESULTADO: BLOQUEADO (403 Forbidden)")
                return Response(
                    {"detalle": config.mensaje_bloqueo_inasistencia or "Usuario bloqueado por inasistencias."},
                    status=status.HTTP_403_FORBIDDEN
                )
            else:
                print("🟢 RESULTADO: PERMITIDO")

        # 2. Validación de Máximo de Citas Diarias
        citas_existentes_dia = Cita.objects.filter(
            paciente_id=paciente_id,
            fecha=fecha_solicitada
        ).exclude(estado__in=['CANCELADA', 'NO_ASISTIO', 'RECHAZADA'])

        cantidad_citas_hoy = citas_existentes_dia.count()

        if cantidad_citas_hoy >= config.max_citas_dia_paciente:
             return Response({"detalle": f"Límite diario alcanzado ({config.max_citas_dia_paciente})."}, status=status.HTTP_400_BAD_REQUEST)

        if not config.permitir_mismo_servicio_dia:
            if citas_existentes_dia.filter(servicio_id=servicio_id).exists():
                return Response({"detalle": "Ya tienes cita para este servicio hoy."}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

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