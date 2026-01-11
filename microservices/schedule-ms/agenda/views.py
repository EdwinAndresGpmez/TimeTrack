from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Disponibilidad, BloqueoAgenda
from .serializers import DisponibilidadSerializer, BloqueoAgendaSerializer

class DisponibilidadViewSet(viewsets.ModelViewSet):
    queryset = Disponibilidad.objects.all()
    serializer_class = DisponibilidadSerializer
    
    # Filtros para que el frontend pueda buscar horarios específicos
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['profesional_id', 'lugar_id', 'dia_semana', 'servicio_id']
    ordering_fields = ['dia_semana', 'hora_inicio']

class BloqueoAgendaViewSet(viewsets.ModelViewSet):
    queryset = BloqueoAgenda.objects.all()
    serializer_class = BloqueoAgendaSerializer
    
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['profesional_id']
    ordering_fields = ['fecha_inicio']