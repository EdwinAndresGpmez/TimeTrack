from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Especialidad, Lugar, Profesional, Servicio
from .serializers import (
    EspecialidadSerializer, 
    LugarSerializer, 
    ProfesionalSerializer, 
    ServicioSerializer
)

class EspecialidadViewSet(viewsets.ModelViewSet):
    queryset = Especialidad.objects.all().order_by('nombre') # Trae todo
    serializer_class = EspecialidadSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend] # Habilitar filtros
    search_fields = ['nombre']
    filterset_fields = ['activo'] # Permitir ?activo=true

class LugarViewSet(viewsets.ModelViewSet):
    queryset = Lugar.objects.all().order_by('nombre') # Trae todo
    serializer_class = LugarSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['nombre', 'ciudad']
    filterset_fields = ['activo', 'ciudad'] # Permitir ?activo=true

class ProfesionalViewSet(viewsets.ModelViewSet):
    queryset = Profesional.objects.all().order_by('nombre') # Trae todo
    serializer_class = ProfesionalSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['nombre', 'numero_documento', 'especialidades__nombre']
    filterset_fields = ['activo', 'especialidades', 'lugares_atencion', 'servicios_habilitados']

class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all().order_by('nombre') # Trae todo
    serializer_class = ServicioSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['nombre']
    filterset_fields = ['activo'] # Permitir ?activo=true