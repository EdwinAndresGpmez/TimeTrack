from rest_framework import viewsets, filters
from .models import Paciente, TipoPaciente
from .serializers import PacienteSerializer, TipoPacienteSerializer

class TipoPacienteViewSet(viewsets.ModelViewSet):
    queryset = TipoPaciente.objects.all()
    serializer_class = TipoPacienteSerializer

class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['numero_documento', 'nombre', 'apellido']

    # === AGREGAR ESTO PARA FILTRAR POR USUARIO ===
    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset
    # =============================================