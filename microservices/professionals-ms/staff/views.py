from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend # <--- IMPORTANTE
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
    queryset = Lugar.objects.filter(activo=True)
    serializer_class = LugarSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'ciudad']

class ProfesionalViewSet(viewsets.ModelViewSet):
    queryset = Profesional.objects.filter(activo=True)
    serializer_class = ProfesionalSerializer
    
    # Agregamos DjangoFilterBackend para filtrar por ID exacto
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    
    search_fields = ['nombre', 'numero_documento', 'especialidades__nombre']
    
    # Esto permite: /api/v1/staff/profesionales/?lugares_atencion=1
    filterset_fields = ['especialidades', 'lugares_atencion', 'servicios_habilitados']

class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.filter(activo=True)
    serializer_class = ServicioSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']