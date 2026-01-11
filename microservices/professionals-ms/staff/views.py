from rest_framework import viewsets, filters
from .models import Especialidad, Lugar, Profesional, Servicio
from .serializers import (
    EspecialidadSerializer, 
    LugarSerializer, 
    ProfesionalSerializer, 
    ServicioSerializer
)

class EspecialidadViewSet(viewsets.ModelViewSet):
    queryset = Especialidad.objects.all()
    serializer_class = EspecialidadSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class LugarViewSet(viewsets.ModelViewSet):
    queryset = Lugar.objects.all()
    serializer_class = LugarSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'ciudad']

class ProfesionalViewSet(viewsets.ModelViewSet):
    queryset = Profesional.objects.all()
    serializer_class = ProfesionalSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'numero_documento', 'especialidades__nombre'] # Búsqueda potente

class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']