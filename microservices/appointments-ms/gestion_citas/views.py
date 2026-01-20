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
    
    # Hack para que si no existe la config, la cree automáticamente al listar
    def list(self, request, *args, **kwargs):
        obj, created = ConfiguracionGlobal.objects.get_or_create(pk=1)
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

class CitaViewSet(viewsets.ModelViewSet):
    """
    Gestión principal de Citas.
    Incluye lógica de negocio para validación de cancelaciones.
    """
    queryset = Cita.objects.all().order_by('-fecha', '-hora_inicio')
    serializer_class = CitaSerializer

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]

    filterset_fields = [
        'fecha',           # Para buscar citas de hoy
        'paciente_id',     # Para el historial del paciente
        'profesional_id',  # Para la agenda del médico
        'estado',          # Para ver solo PENDIENTES o EN_SALA
        'lugar_id'
    ]

    ordering_fields = ['fecha', 'hora_inicio']

    def update(self, request, *args, **kwargs):
        """
        Sobrescribimos el update para validar reglas de negocio antes de guardar,
        específicamente la regla de tiempo mínimo para cancelación.
        """
        # 1. Obtenemos la cita actual de la base de datos
        instance = self.get_object()
        
        # 2. Verificamos si la intención es CANCELAR la cita
        nuevo_estado = request.data.get('estado')
        
        if nuevo_estado == 'CANCELADA' and instance.estado != 'CANCELADA':
            
            # --- INICIO LÓGICA PARAMETRIZADA ---
            
            # A. Obtener la regla de la BD (Singleton ID=1)
            config, _ = ConfiguracionGlobal.objects.get_or_create(pk=1)
            horas_limite = config.horas_antelacion_cancelar
            
            # B. Calcular tiempo restante para la cita
            # Combinamos fecha y hora para tener un objeto datetime completo
            try:
                fecha_hora_cita = datetime.combine(instance.fecha, instance.hora_inicio)
                # Hacemos la fecha "consciente" de la zona horaria (timezone aware) para poder comparar con now()
                fecha_hora_cita = timezone.make_aware(fecha_hora_cita)
            except ValueError:
                # Si ya tiene zona horaria o hay error de formato, intentamos conversión simple
                fecha_hora_cita = instance.fecha # Fallback simple
            
            ahora = timezone.now()
            
            # Calculamos la diferencia en horas
            diferencia = fecha_hora_cita - ahora
            horas_restantes = diferencia.total_seconds() / 3600

            # C. Validar la regla
            if horas_restantes < horas_limite:
                # Usamos el mensaje configurado en BD, o uno por defecto si está vacío
                mensaje_error = config.mensaje_notificacion_cancelacion or f"La política de cancelación requiere al menos {horas_limite} horas de antelación."
                
                return Response(
                    {
                        "error": "No es posible cancelar la cita.",
                        "detalle": mensaje_error, 
                        "horas_restantes": round(horas_restantes, 1)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().update(request, *args, **kwargs)

class NotaMedicaViewSet(viewsets.ModelViewSet):
    """
    CRUD para las notas médicas asociadas a las citas.
    """
    queryset = NotaMedica.objects.all()
    serializer_class = NotaMedicaSerializer

class HistoricoCitaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Solo lectura para el histórico. No queremos que nadie edite la auditoría.
    """
    queryset = HistoricoCita.objects.all().order_by('-fecha_registro')
    serializer_class = HistoricoCitaSerializer