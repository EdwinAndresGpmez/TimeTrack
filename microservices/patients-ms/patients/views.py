from rest_framework import viewsets, filters
from .models import Paciente, TipoPaciente
from .serializers import PacienteSerializer, TipoPacienteSerializer

class TipoPacienteViewSet(viewsets.ModelViewSet):
    queryset = TipoPaciente.objects.all()
    serializer_class = TipoPacienteSerializer

class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    
    # Configuración de búsqueda potente
    filter_backends = [filters.SearchFilter]
    search_fields = ['numero_documento', 'nombre', 'apellido'] # Permite buscar por cédula o nombre