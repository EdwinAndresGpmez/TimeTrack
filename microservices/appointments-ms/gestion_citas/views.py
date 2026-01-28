import requests  
import logging
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend

# Importación de Modelos
from .models import Cita, NotaMedica, HistoricoCita, ConfiguracionGlobal

# Importación de Serializadores
from .serializers import (
    CitaSerializer, 
    NotaMedicaSerializer, 
    HistoricoCitaSerializer, 
    ConfiguracionGlobalSerializer
)
from django.db.models import Count

# URLs de Microservicios (Asegúrate que coincidan con tu docker-compose)
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
    Incluye lógica de negocio para AGENDAMIENTO y CANCELACIÓN.
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

    # --- LÓGICA DE VALIDACIÓN AL CREAR (AGENDAR) ---
    def create(self, request, *args, **kwargs):
        # Datos entrantes
        data = request.data
        paciente_id = data.get('paciente_id')
        fecha_solicitada = data.get('fecha')
        servicio_id = data.get('servicio_id')

        # 1. Cargar Reglas de Negocio
        config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)

        if config.limite_inasistencias > 0:
            
            # 1. Obtener información del paciente para saber su fecha de corte
            fecha_corte = None
            try:
                # Usamos tu URL configurada para consultar detalles internos
                # Nota: Asegúrate de que este endpoint devuelva el campo 'ultima_fecha_desbloqueo'
                url = f"http://patients-ms:8001/api/v1/pacientes/{paciente_id}/" 
                resp = requests.get(url, timeout=3)
                if resp.status_code == 200:
                    paciente_data = resp.json()
                    fecha_str = paciente_data.get('ultima_fecha_desbloqueo')
                    if fecha_str:
                        fecha_corte = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
            except Exception as e:
                logger.error(f"Error consultando fecha desbloqueo paciente: {e}")
                # Si falla la conexión, asumimos nulo (cuenta histórica completa) por seguridad

            # 2. Construir la consulta
            query_inasistencias = Cita.objects.filter(
                paciente_id=paciente_id,
                estado='NO_ASISTIO'
            )

            # 3. APLICAR FILTRO DE FECHA (La clave de tu requerimiento)
            if fecha_corte:
                # Solo contamos las citas que ocurrieron DESPUÉS del último desbloqueo
                query_inasistencias = query_inasistencias.filter(fecha__gte=fecha_corte.date())

            conteo_inasistencias = query_inasistencias.count()

            if conteo_inasistencias >= config.limite_inasistencias:
                mensaje = config.mensaje_bloqueo_inasistencia or "Usuario bloqueado por inasistencias."
                return Response(
                    {"detalle": mensaje},
                    status=status.HTTP_403_FORBIDDEN
                )

        # 2. Consultar historial del paciente para ese día
        citas_existentes_dia = Cita.objects.filter(
            paciente_id=paciente_id,
            fecha=fecha_solicitada
        ).exclude(estado__in=['CANCELADA', 'NO_ASISTIO', 'RECHAZADA'])

        cantidad_citas_hoy = citas_existentes_dia.count()

        # --- REGLA 1: LÍMITE DE CITAS DIARIAS ---
        if cantidad_citas_hoy >= config.max_citas_dia_paciente:
            return Response(
                {
                    "detalle": f"Has alcanzado el límite permitido de citas por día ({config.max_citas_dia_paciente}). No puedes agendar más citas para esta fecha."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- REGLA 2: REPETIR MISMO SERVICIO ---
        if not config.permitir_mismo_servicio_dia:
            ya_tiene_servicio = citas_existentes_dia.filter(servicio_id=servicio_id).exists()
            
            if ya_tiene_servicio:
                return Response(
                    {
                        "detalle": "Ya tienes una cita agendada para este mismo servicio en esta fecha."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        return super().create(request, *args, **kwargs)


    # --- LÓGICA DE VALIDACIÓN AL ACTUALIZAR (CANCELAR) ---
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        if nuevo_estado == 'CANCELADA' and instance.estado != 'CANCELADA':
            config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)
            horas_limite = config.horas_antelacion_cancelar
            
            ahora = timezone.now()
            
            try:
                fecha_cita = datetime.combine(instance.fecha, instance.hora_inicio)
                if timezone.is_naive(fecha_cita):
                    fecha_cita = timezone.make_aware(fecha_cita)
            except Exception:
                fecha_cita = datetime.combine(instance.fecha, datetime.min.time())
                if timezone.is_naive(fecha_cita):
                    fecha_cita = timezone.make_aware(fecha_cita)
            
            diferencia = fecha_cita - ahora
            horas_restantes = diferencia.total_seconds() / 3600

            if horas_restantes < horas_limite:
                mensaje = config.mensaje_notificacion_cancelacion or f"Se requiere un mínimo de {horas_limite} horas de antelación para cancelar."
                return Response(
                    {
                        "error": "Validación de negocio fallida",
                        "detalle": mensaje, 
                        "horas_faltantes": round(horas_restantes, 1)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        return super().update(request, *args, **kwargs)
    
    # --- LISTADO CON ENRIQUECIMIENTO DE DATOS ---
    def list(self, request, *args, **kwargs):
        # 1. Obtener datos normales de la BD local
        response = super().list(request, *args, **kwargs)
        
        # Detectar si es paginado o lista simple
        if isinstance(response.data, dict) and 'results' in response.data:
            data = response.data['results']
            paginated = True
        else:
            data = response.data
            paginated = False
        
        # 2. Enriquecer los datos (Llamar al método único _enrich_data)
        data_enriquecida = self._enrich_data(data)
        
        # 3. Devolver respuesta modificada
        if paginated:
            response.data['results'] = data_enriquecida
        else:
            response.data = data_enriquecida
            
        return response

    # --- MÉTODO PRIVADO DE ENRIQUECIMIENTO (UNIFICADO) ---
    def _enrich_data(self, citas):
        if not citas: return citas

        # A. Recolectar IDs únicos
        ids = {
            'paciente': set(),
            'profesional': set(),
            'servicio': set(),
            'lugar': set()
        }
        
        for c in citas:
            if c.get('paciente_id'): ids['paciente'].add(str(c['paciente_id']))
            if c.get('profesional_id'): ids['profesional'].add(str(c['profesional_id']))
            if c.get('servicio_id'): ids['servicio'].add(str(c['servicio_id']))
            if c.get('lugar_id'): ids['lugar'].add(str(c['lugar_id']))

        # B. Función Helper para consultar microservicios
        def fetch_bulk(url, id_set):
            if not id_set: return {}
            try:
                # Timeout de 2s para no bloquear la respuesta si un MS está lento
                resp = requests.get(f"{url}?ids={','.join(id_set)}", timeout=2)
                return resp.json() if resp.status_code == 200 else {}
            except Exception as e:
                logger.error(f"Error bulk {url}: {e}")
                return {}

        # C. Obtener Diccionarios de Datos
        info_pacientes = fetch_bulk(PATIENTS_MS_URL, ids['paciente'])
        info_profesionales = fetch_bulk(STAFF_MS_URL, ids['profesional'])
        info_servicios = fetch_bulk(SERVICES_MS_URL, ids['servicio'])
        info_lugares = fetch_bulk(LUGARES_MS_URL, ids['lugar'])

        # D. Inyectar Nombres en la Lista de Citas
        for c in citas:
            # Paciente
            p_id = str(c.get('paciente_id'))
            if p_id in info_pacientes:
                c['paciente_nombre'] = info_pacientes[p_id].get('nombre_completo', 'Desconocido')
                # CORRECCIÓN: Usar 'numero_documento' que es lo que manda patients-ms
                c['paciente_doc'] = info_pacientes[p_id].get('numero_documento', 'N/A')
            else:
                c['paciente_nombre'] = 'No encontrado'
                c['paciente_doc'] = 'N/A'

            # Profesional
            prof_id = str(c.get('profesional_id'))
            if prof_id in info_profesionales:
                c['profesional_nombre'] = info_profesionales[prof_id].get('nombre', 'Desconocido')
            else:
                c['profesional_nombre'] = 'No asignado'

            # Servicio
            srv_id = str(c.get('servicio_id'))
            if srv_id in info_servicios:
                c['servicio_nombre'] = info_servicios[srv_id].get('nombre', 'Servicio')
            else:
                c['servicio_nombre'] = 'No especificado'

            # Lugar (Sede)
            lug_id = str(c.get('lugar_id'))
            if lug_id in info_lugares:
                c['lugar_nombre'] = info_lugares[lug_id].get('nombre', 'Sede')
            else:
                c['lugar_nombre'] = 'Sede Principal'

        return citas

class NotaMedicaViewSet(viewsets.ModelViewSet):
    queryset = NotaMedica.objects.all()
    serializer_class = NotaMedicaSerializer

class HistoricoCitaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoricoCita.objects.all().order_by('-fecha_registro')
    serializer_class = HistoricoCitaSerializer

class ReporteInasistenciasViewSet(viewsets.ViewSet):
    """
    Devuelve un diccionario con el estado de inasistencias de los pacientes.
    Respuesta: { "123": { "cantidad": 3, "bloqueado": true }, ... }
    """
    permission_classes = [permissions.IsAuthenticated] # O IsAdminUser

    def list(self, request):
        config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)
        limite = config.limite_inasistencias
        
        # Obtenemos solo los pacientes que tienen al menos 1 inasistencia
        data = (
            Cita.objects.filter(estado='NO_ASISTIO')
            .values('paciente_id')
            .annotate(total=Count('id'))
        )

        resultado = {}
        for item in data:
            pid = str(item['paciente_id'])
            cantidad = item['total']
            # Determinamos si está bloqueado según la regla global
            bloqueado = (limite > 0) and (cantidad >= limite)
            
            resultado[pid] = {
                "inasistencias": cantidad,
                "bloqueado_por_inasistencias": bloqueado
            }

        return Response(resultado)