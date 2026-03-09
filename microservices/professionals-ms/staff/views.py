from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .utils.permissions import InternalTokenOrAuthenticated
from .models import Especialidad, Lugar, Profesional, Servicio
from .serializers import (
    EspecialidadSerializer,
    LugarSerializer,
    ProfesionalSerializer,
    ServicioSerializer,
)
from .utils.audit_client import audit_log


def _uid(request):
    return request.user.id if getattr(request, "user", None) and request.user.is_authenticated else None


def _audit_from_view(request, *, descripcion, accion, recurso, recurso_id=None, metadata=None):
    audit_log(
        descripcion=descripcion,
        modulo="STAFF",
        accion=accion,
        usuario_id=_uid(request),
        recurso=recurso,
        recurso_id=str(recurso_id) if recurso_id is not None else None,
        metadata=metadata or {},
        ip=request.META.get("REMOTE_ADDR"),
        user_agent=request.META.get("HTTP_USER_AGENT"),
    )


class EspecialidadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Especialidad.objects.all().order_by("nombre")
    serializer_class = EspecialidadSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["nombre"]
    filterset_fields = ["activo"]

    def perform_create(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"CREATE Especialidad #{obj.pk}",
            accion="CREATE",
            recurso="Especialidad",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None), "activo": getattr(obj, "activo", None)},
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"UPDATE Especialidad #{obj.pk}",
            accion="UPDATE",
            recurso="Especialidad",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None), "activo": getattr(obj, "activo", None)},
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        meta = {"nombre": getattr(instance, "nombre", None), "activo": getattr(instance, "activo", None)}
        instance.delete()
        _audit_from_view(
            self.request,
            descripcion=f"DELETE Especialidad #{pk}",
            accion="DELETE",
            recurso="Especialidad",
            recurso_id=pk,
            metadata=meta,
        )


class LugarViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Lugar.objects.all().order_by("nombre")
    serializer_class = LugarSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["nombre", "ciudad"]
    filterset_fields = ["activo", "ciudad"]

    def perform_create(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"CREATE Lugar #{obj.pk}",
            accion="CREATE",
            recurso="Lugar",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None), "ciudad": getattr(obj, "ciudad", None)},
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"UPDATE Lugar #{obj.pk}",
            accion="UPDATE",
            recurso="Lugar",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None), "ciudad": getattr(obj, "ciudad", None)},
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        meta = {"nombre": getattr(instance, "nombre", None), "ciudad": getattr(instance, "ciudad", None)}
        instance.delete()
        _audit_from_view(
            self.request,
            descripcion=f"DELETE Lugar #{pk}",
            accion="DELETE",
            recurso="Lugar",
            recurso_id=pk,
            metadata=meta,
        )


class ProfesionalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Profesional.objects.all().order_by("nombre")
    serializer_class = ProfesionalSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["nombre", "numero_documento", "especialidades__nombre"]
    filterset_fields = ["activo", "especialidades", "lugares_atencion", "servicios_habilitados"]

    def perform_create(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"CREATE Profesional #{obj.pk}",
            accion="CREATE",
            recurso="Profesional",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None), "numero_documento": getattr(obj, "numero_documento", None)},
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"UPDATE Profesional #{obj.pk}",
            accion="UPDATE",
            recurso="Profesional",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None), "activo": getattr(obj, "activo", None)},
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        meta = {"nombre": getattr(instance, "nombre", None), "numero_documento": getattr(instance, "numero_documento", None)}
        instance.delete()
        _audit_from_view(
            self.request,
            descripcion=f"DELETE Profesional #{pk}",
            accion="DELETE",
            recurso="Profesional",
            recurso_id=pk,
            metadata=meta,
        )


class ServicioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Servicio.objects.all().order_by("nombre")
    serializer_class = ServicioSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["nombre"]
    filterset_fields = ["activo"]

    def perform_create(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"CREATE Servicio #{obj.pk}",
            accion="CREATE",
            recurso="Servicio",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None)},
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"UPDATE Servicio #{obj.pk}",
            accion="UPDATE",
            recurso="Servicio",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None), "activo": getattr(obj, "activo", None)},
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        meta = {"nombre": getattr(instance, "nombre", None), "activo": getattr(instance, "activo", None)}
        instance.delete()
        _audit_from_view(
            self.request,
            descripcion=f"DELETE Servicio #{pk}",
            accion="DELETE",
            recurso="Servicio",
            recurso_id=pk,
            metadata=meta,
        )


class BulkProfesionalView(APIView):
    permission_classes = [InternalTokenOrAuthenticated]

    def get(self, request):
        ids_param = request.query_params.get("ids", "")
        if not ids_param:
            return Response({})

        ids = ids_param.split(",")
        objs = Profesional.objects.filter(id__in=ids)

        data = {}
        for p in objs:
            especialidad_str = str(p.especialidades.first()) if p.especialidades.exists() else "General"
            data[str(p.id)] = {
                "nombre": p.nombre,
                "especialidad": especialidad_str,
                "activo": p.activo,
                "lugares_atencion": list(p.lugares_atencion.values_list("id", flat=True)),
                "servicios_habilitados": list(p.servicios_habilitados.values_list("id", flat=True)),
            }

        return Response(data)


class BulkServicioView(APIView):
    permission_classes = [InternalTokenOrAuthenticated]

    def get(self, request):
        ids = request.query_params.get("ids", "").split(",")
        objs = Servicio.objects.filter(id__in=ids)

        data = {}
        for s in objs:
            data[str(s.id)] = {
                "nombre": s.nombre,
                "duracion": getattr(s, "duracion_minutos", None),
                "precio": getattr(s, "precio_base", None),
                "tipos_paciente_ids": getattr(s, "tipos_paciente_ids", []) or [],
            }
        return Response(data)


class BulkLugarView(APIView):
    permission_classes = [InternalTokenOrAuthenticated]

    def get(self, request):
        ids = request.query_params.get("ids", "").split(",")
        objs = Lugar.objects.filter(id__in=ids)

        data = {}
        for obj in objs:
            data[str(obj.id)] = {"nombre": obj.nombre, "ciudad": obj.ciudad}
        return Response(data)
