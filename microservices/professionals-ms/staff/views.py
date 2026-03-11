from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from rest_framework import filters, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .utils.permissions import InternalTokenOrAuthenticated
from .utils.tenant_policy import get_current_tenant_policy, get_feature_rule
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
        request_headers=request.headers,
    )


def _enforce_cap_profesionales(request):
    policy = get_current_tenant_policy(request)
    cap_profesionales = get_feature_rule(policy, "cap_profesionales")
    cap_habilitado = bool(cap_profesionales.get("enabled", False))
    limite = cap_profesionales.get("limit_int")

    if not cap_habilitado or limite is None:
        return

    activos = Profesional.objects.filter(activo=True).count()
    if activos >= int(limite):
        raise ValidationError(
            {
                "detail": (
                    f"El plan actual permite maximo {limite} profesional(es) activos. "
                    "Actualiza el plan o desactiva uno para continuar."
                )
            }
        )        


def _enforce_cap_sedes(request, *, instance=None, incoming_active=True):
    if not incoming_active:
        return

    policy = get_current_tenant_policy(request)
    cap_sedes = get_feature_rule(policy, "cap_sedes")
    sedes_habilitado = bool(cap_sedes.get("enabled", False))
    limite_sedes = cap_sedes.get("limit_int")

    if not sedes_habilitado or limite_sedes is None:
        return

    activos = Lugar.objects.filter(activo=True).count()
    limite = int(limite_sedes)
    projected = activos

    if instance is None:
        projected = activos + 1
    elif not instance.activo and incoming_active:
        projected = activos + 1

    if projected > limite:
        raise ValidationError(
            {
                "detail": (
                    f"El plan actual permite maximo {limite} sede(s) activas. "
                    "Actualiza el plan o desactiva una sede para continuar."
                )
            }
        )


def _is_internal_call(request) -> bool:
    token = request.headers.get("X-INTERNAL-TOKEN", "")
    return bool(token and token == getattr(settings, "INTERNAL_SERVICE_TOKEN", ""))


def _api_publica_enabled(request) -> bool:
    policy = get_current_tenant_policy(request)
    regla = get_feature_rule(policy, "api_publica")
    return bool(regla.get("enabled", False))


def _enforce_api_publica_for_external(request):
    if _is_internal_call(request):
        return
    if not _api_publica_enabled(request):
        raise PermissionDenied(
            "Tu plan no incluye API Publica. Este endpoint de integracion no esta disponible."
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
        activo_nuevo = serializer.validated_data.get("activo", True)
        _enforce_cap_sedes(self.request, instance=None, incoming_active=activo_nuevo)

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
        instance = serializer.instance
        nuevo_activo = serializer.validated_data.get("activo", instance.activo)
        _enforce_cap_sedes(self.request, instance=instance, incoming_active=nuevo_activo)

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

    @action(detail=False, methods=["post"], url_path="import-masivo")
    def import_masivo(self, request):
        rows = request.data.get("rows", [])
        skip_duplicates = bool(request.data.get("skip_duplicates", True))

        if not isinstance(rows, list) or not rows:
            raise ValidationError(
                {"detail": "Payload invalido. Envia 'rows' como lista con sedes a importar."}
            )

        created = []
        errors = []

        for idx, row in enumerate(rows):
            if not isinstance(row, dict):
                errors.append({"index": idx, "detail": "Fila invalida: se esperaba un objeto JSON."})
                continue

            if skip_duplicates:
                nombre = (row.get("nombre") or "").strip()
                direccion = (row.get("direccion") or "").strip()
                ciudad = (row.get("ciudad") or "").strip()
                if nombre and direccion and ciudad:
                    exists = Lugar.objects.filter(
                        nombre__iexact=nombre,
                        direccion__iexact=direccion,
                        ciudad__iexact=ciudad,
                    ).exists()
                    if exists:
                        errors.append({"index": idx, "detail": "Duplicado omitido (nombre+direccion+ciudad)."})
                        continue

            serializer = self.get_serializer(data=row)
            if not serializer.is_valid():
                errors.append({"index": idx, "detail": serializer.errors})
                continue

            try:
                activo_nuevo = serializer.validated_data.get("activo", True)
                _enforce_cap_sedes(self.request, incoming_active=activo_nuevo)
                obj = serializer.save()
            except ValidationError as exc:
                errors.append({"index": idx, "detail": getattr(exc, "detail", str(exc))})
                continue

            _audit_from_view(
                request,
                descripcion=f"IMPORT_CREATE Lugar #{obj.pk}",
                accion="IMPORT_CREATE",
                recurso="Lugar",
                recurso_id=obj.pk,
                metadata={"nombre": obj.nombre, "ciudad": obj.ciudad},
            )
            created.append(self.get_serializer(obj).data)

        return Response(
            {
                "created_count": len(created),
                "error_count": len(errors),
                "created": created,
                "errors": errors,
            }
        )


class ProfesionalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Profesional.objects.all().order_by("nombre")
    serializer_class = ProfesionalSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["nombre", "numero_documento", "especialidades__nombre"]
    filterset_fields = ["activo", "especialidades", "lugares_atencion", "servicios_habilitados"]

    def perform_create(self, serializer):
        activo_nuevo = serializer.validated_data.get("activo", True)
        if activo_nuevo:
            _enforce_cap_profesionales(self.request)

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
        instance = serializer.instance
        nuevo_activo = serializer.validated_data.get("activo", instance.activo)
        if (not instance.activo) and nuevo_activo:
            _enforce_cap_profesionales(self.request)

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
        _enforce_api_publica_for_external(request)

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
        _enforce_api_publica_for_external(request)

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
        _enforce_api_publica_for_external(request)

        ids = request.query_params.get("ids", "").split(",")
        objs = Lugar.objects.filter(id__in=ids)

        data = {}
        for obj in objs:
            data[str(obj.id)] = {"nombre": obj.nombre, "ciudad": obj.ciudad}
        return Response(data)
