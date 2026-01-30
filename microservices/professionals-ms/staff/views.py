from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Especialidad, Lugar, Profesional, Servicio
from .serializers import (
    EspecialidadSerializer,
    LugarSerializer,
    ProfesionalSerializer,
    ServicioSerializer,
)


class EspecialidadViewSet(viewsets.ModelViewSet):
    queryset = Especialidad.objects.all().order_by("nombre")  # Trae todo
    serializer_class = EspecialidadSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]  # Habilitar filtros
    search_fields = ["nombre"]
    filterset_fields = ["activo"]  # Permitir ?activo=true


class LugarViewSet(viewsets.ModelViewSet):
    queryset = Lugar.objects.all().order_by("nombre")  # Trae todo
    serializer_class = LugarSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["nombre", "ciudad"]
    filterset_fields = ["activo", "ciudad"]  # Permitir ?activo=true


class ProfesionalViewSet(viewsets.ModelViewSet):
    queryset = Profesional.objects.all().order_by("nombre")  # Trae todo
    serializer_class = ProfesionalSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["nombre", "numero_documento", "especialidades__nombre"]
    filterset_fields = [
        "activo",
        "especialidades",
        "lugares_atencion",
        "servicios_habilitados",
    ]


class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all().order_by("nombre")  # Trae todo
    serializer_class = ServicioSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["nombre"]
    filterset_fields = ["activo"]  # Permitir ?activo=true


class BulkProfesionalView(APIView):
    """
    Endpoint interno para microservicios.
    Devuelve datos básicos de profesionales por lista de IDs.
    """

    def get(self, request):
        ids_param = request.query_params.get("ids", "")
        if not ids_param:
            return Response({})

        ids = ids_param.split(",")
        # Filtramos por IDs válidos
        objs = Profesional.objects.filter(id__in=ids)

        data = {}
        for p in objs:
            # Obtenemos la primera especialidad como string, o 'General' si no tiene
            especialidad_str = str(p.especialidades.first()) if p.especialidades.exists() else "General"

            data[str(p.id)] = {
                # CORRECCIÓN: Usamos solo p.nombre, ya que tu modelo no tiene 'apellido'
                "nombre": p.nombre,
                "especialidad": especialidad_str,
            }

        return Response(data)


class BulkServicioView(APIView):
    def get(self, request):
        ids = request.query_params.get("ids", "").split(",")
        # Filtramos los servicios solicitados
        objs = Servicio.objects.filter(id__in=ids)

        data = {}
        for s in objs:
            data[str(s.id)] = {
                "nombre": s.nombre,
                "duracion": s.duracion_minutos,
                "precio": s.precio_base,
            }
        return Response(data)


class BulkLugarView(APIView):
    def get(self, request):
        ids = request.query_params.get("ids", "").split(",")
        objs = Lugar.objects.filter(id__in=ids)

        data = {}
        for obj in objs:
            data[str(obj.id)] = {"nombre": obj.nombre, "ciudad": obj.ciudad}
        return Response(data)
