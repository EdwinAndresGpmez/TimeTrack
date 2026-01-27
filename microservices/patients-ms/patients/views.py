from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, filters, status, permissions
from .models import Paciente, TipoPaciente, SolicitudValidacion
from .serializers import PacienteSerializer, TipoPacienteSerializer, SolicitudValidacionSerializer

# 1. ViewSet para Tipos de Paciente (EPS, Prepagada, etc.)
class TipoPacienteViewSet(viewsets.ModelViewSet):
    queryset = TipoPaciente.objects.all()
    serializer_class = TipoPacienteSerializer

# 2. ViewSet Principal de Pacientes
class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['numero_documento', 'nombre', 'apellido']

    # Filtrado por User ID (Usado por el Perfil)
    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset

# 3. NUEVO: ViewSet para Solicitudes de Validación (Para el Admin)
class SolicitudValidacionViewSet(viewsets.ModelViewSet):
    queryset = SolicitudValidacion.objects.all()
    serializer_class = SolicitudValidacionSerializer
    
    # 2. IMPORTANTE: PERMITIR ACCESO INTERNO SIN TOKEN
    permission_classes = [permissions.AllowAny] 
    
    # Filtro para ver solo las "No Procesadas"
    def get_queryset(self):
        queryset = super().get_queryset()
        procesado = self.request.query_params.get('procesado')
        
        if procesado is not None:
            # Convertimos el string 'false'/'true' a booleano
            is_processed = procesado.lower() == 'true'
            queryset = queryset.filter(procesado=is_processed)
            
        return queryset.order_by('-fecha_solicitud')

# 4. Endpoint de Autocorrección (Self-Healing)
class SyncPacienteUserView(APIView):
    """
    Endpoint de Autocorrección e Integridad de Datos.
    Regla de Oro: Si el documento coincide, el Usuario reclamando ES el dueño.
    """
    def post(self, request):
        documento = request.data.get('documento')
        user_id = request.data.get('user_id')

        if not documento or not user_id:
            return Response({'error': 'Faltan datos críticos (doc/user_id)'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # A. Buscamos al paciente por su "Huella Digital" (Documento)
            paciente = Paciente.objects.get(numero_documento=documento)
            cambios_realizados = []

            # B. VALIDACIÓN Y CORRECCIÓN: ¿El paciente apunta al usuario correcto?
            # Nota: Convertimos a string por si vienen tipos diferentes
            if str(paciente.user_id) != str(user_id):
                old_user = paciente.user_id
                paciente.user_id = user_id
                paciente.save()
                cambios_realizados.append(f"Corregido user_id de {old_user} a {user_id}")

            # C. Retornamos ÉXITO y el ID del paciente para que Auth se corrija
            return Response({
                'status': 'found',
                'paciente_id': paciente.id,
                'corrected': len(cambios_realizados) > 0,
                'details': cambios_realizados
            }, status=status.HTTP_200_OK)

        except Paciente.DoesNotExist:
            # D. Si no existe, avisamos al Frontend para que proceda a CREARLO
            return Response({'status': 'not_found'}, status=status.HTTP_404_NOT_FOUND)
        
                  
class BulkPacienteView(APIView):
    """
    Internal endpoint to return patient names by ID list.
    """
    def get(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            return Response({})
            
        ids = ids_param.split(',')
        pacientes = Paciente.objects.filter(id__in=ids)
        
        data = {}
        for p in pacientes:
            data[str(p.id)] = {
                "nombre_completo": f"{p.nombre} {p.apellido}",
                "numero_documento": p.numero_documento,
                "tipo_doc": p.tipo_documento
            }
        return Response(data)