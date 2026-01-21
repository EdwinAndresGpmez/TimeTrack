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

        # 2. Consultar historial del paciente para ese día
        # Exclimos citas canceladas o no asistidas, solo cuentan las activas (Pendiente, Aceptada, Confirmada)
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
            # Verificamos si entre las citas de hoy, ya existe el servicio que intenta pedir
            ya_tiene_servicio = citas_existentes_dia.filter(servicio_id=servicio_id).exists()
            
            if ya_tiene_servicio:
                return Response(
                    {
                        "detalle": "Ya tienes una cita agendada para este mismo servicio en esta fecha. La política actual no permite repetir el mismo servicio el mismo día."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Si pasa las validaciones, crea la cita normalmente
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

class NotaMedicaViewSet(viewsets.ModelViewSet):
    queryset = NotaMedica.objects.all()
    serializer_class = NotaMedicaSerializer

class HistoricoCitaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoricoCita.objects.all().order_by('-fecha_registro')
    serializer_class = HistoricoCitaSerializer