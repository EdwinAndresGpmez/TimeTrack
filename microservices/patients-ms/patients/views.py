from django.utils import timezone
from django.db.models import Q
from django.conf import settings
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Paciente, SolicitudValidacion, TipoPaciente
from .permissions import InternalTokenOrAuthenticated, InternalTokenOrAuthenticatedReadOnly
from .serializers import (
    PacienteSerializer,
    SolicitudValidacionSerializer,
    TipoPacienteSerializer,
)
from .utils.audit_client import audit_log
from .utils.tenant_policy import get_current_tenant_policy, get_feature_rule


def _uid(request):
    return request.user.id if getattr(request, "user", None) and request.user.is_authenticated else None


def _audit_from_view(request, *, descripcion, accion, recurso, recurso_id=None, metadata=None):
    audit_log(
        descripcion=descripcion,
        modulo="PATIENTS",
        accion=accion,
        usuario_id=_uid(request),
        recurso=recurso,
        recurso_id=str(recurso_id) if recurso_id is not None else None,
        metadata=metadata or {},
        ip=request.META.get("REMOTE_ADDR"),
        user_agent=request.META.get("HTTP_USER_AGENT"),
        request_headers=request.headers,
    )


def _enforce_cap_pacientes(request):
    policy = get_current_tenant_policy(request)
    cap_pacientes = get_feature_rule(policy, "cap_pacientes")
    cap_habilitado = bool(cap_pacientes.get("enabled", False))
    limite = cap_pacientes.get("limit_int")

    if not cap_habilitado or limite is None:
        return

    activos = Paciente.objects.filter(activo=True).count()
    if activos >= int(limite):
        raise ValidationError(
            {
                "detail": (
                    f"El plan actual permite maximo {limite} paciente(s) activos. "
                    "Actualiza el plan o desactiva uno para continuar."
                )
            }
        )


def _registro_pacientes_enabled(request) -> bool:
    policy = get_current_tenant_policy(request)
    regla = get_feature_rule(policy, "registro_pacientes")
    return bool(regla.get("enabled", False))


def _registro_pacientes_block_response():
    return Response(
        {
            "detail": (
                "Tu plan no incluye Registro de Pacientes. "
                "No puedes crear, editar ni eliminar pacientes."
            )
        },
        status=status.HTTP_403_FORBIDDEN,
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


# 1) Tipos de Paciente
class TipoPacienteViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = TipoPaciente.objects.all()
    serializer_class = TipoPacienteSerializer

    def perform_create(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"CREATE TipoPaciente #{obj.pk}",
            accion="CREATE",
            recurso="TipoPaciente",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None)},
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"UPDATE TipoPaciente #{obj.pk}",
            accion="UPDATE",
            recurso="TipoPaciente",
            recurso_id=obj.pk,
            metadata={"nombre": getattr(obj, "nombre", None)},
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        meta = {"nombre": getattr(instance, "nombre", None)}
        instance.delete()
        _audit_from_view(
            self.request,
            descripcion=f"DELETE TipoPaciente #{pk}",
            accion="DELETE",
            recurso="TipoPaciente",
            recurso_id=pk,
            metadata=meta,
        )


# 2) Pacientes
class PacienteViewSet(viewsets.ModelViewSet):
    permission_classes = [InternalTokenOrAuthenticatedReadOnly]
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["numero_documento", "nombre", "apellido"]

    def _check_registro_pacientes(self, request):
        if not _registro_pacientes_enabled(request):
            return _registro_pacientes_block_response()
        return None

    def get_queryset(self):
        queryset = Paciente.objects.all()
        user_id = self.request.query_params.get("user_id")
        search_query = self.request.query_params.get("search")
        admin_mode = self.request.query_params.get("admin_mode")

        # Perfil de paciente (por user_id)
        if user_id:
            return queryset.filter(user_id=user_id)

        # Buscador admin: si no hay texto, retorna vacío
        if admin_mode:
            if search_query:
                return queryset.filter(
                    Q(numero_documento__icontains=search_query)
                    | Q(nombre__icontains=search_query)
                    | Q(apellido__icontains=search_query)
                )
            return queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        blocked = self._check_registro_pacientes(request)
        if blocked:
            return blocked
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        blocked = self._check_registro_pacientes(request)
        if blocked:
            return blocked
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        blocked = self._check_registro_pacientes(request)
        if blocked:
            return blocked
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        blocked = self._check_registro_pacientes(request)
        if blocked:
            return blocked
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        activo_nuevo = serializer.validated_data.get("activo", True)
        if activo_nuevo:
            _enforce_cap_pacientes(self.request)

        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"CREATE Paciente #{obj.pk}",
            accion="CREATE",
            recurso="Paciente",
            recurso_id=obj.pk,
            metadata={
                "numero_documento": getattr(obj, "numero_documento", None),
                "nombre": getattr(obj, "nombre", None),
                "apellido": getattr(obj, "apellido", None),
                "user_id": getattr(obj, "user_id", None),
            },
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        nuevo_activo = serializer.validated_data.get("activo", instance.activo)
        if (not instance.activo) and nuevo_activo:
            _enforce_cap_pacientes(self.request)

        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"UPDATE Paciente #{obj.pk}",
            accion="UPDATE",
            recurso="Paciente",
            recurso_id=obj.pk,
            metadata={
                "numero_documento": getattr(obj, "numero_documento", None),
                "nombre": getattr(obj, "nombre", None),
                "apellido": getattr(obj, "apellido", None),
                "user_id": getattr(obj, "user_id", None),
            },
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        meta = {
            "numero_documento": getattr(instance, "numero_documento", None),
            "nombre": getattr(instance, "nombre", None),
            "apellido": getattr(instance, "apellido", None),
            "user_id": getattr(instance, "user_id", None),
        }
        instance.delete()
        _audit_from_view(
            self.request,
            descripcion=f"DELETE Paciente #{pk}",
            accion="DELETE",
            recurso="Paciente",
            recurso_id=pk,
            metadata=meta,
        )

    @action(detail=True, methods=["post"], url_path="reset-inasistencias")
    def reset_inasistencias(self, request, pk=None):
        paciente = self.get_object()
        paciente.ultima_fecha_desbloqueo = timezone.now()
        paciente.save()

        _audit_from_view(
            request,
            descripcion=f"RESET_INASISTENCIAS Paciente #{paciente.pk}",
            accion="RESET_INASISTENCIAS",
            recurso="Paciente",
            recurso_id=paciente.pk,
            metadata={"nueva_fecha_corte": paciente.ultima_fecha_desbloqueo.isoformat()},
        )

        return Response(
            {"mensaje": "Contador reiniciado.", "nueva_fecha_corte": paciente.ultima_fecha_desbloqueo}
        )


# 3) Solicitudes de Validación (antes AllowAny)
class SolicitudValidacionViewSet(viewsets.ModelViewSet):
    queryset = SolicitudValidacion.objects.all()
    serializer_class = SolicitudValidacionSerializer
    permission_classes = [InternalTokenOrAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        procesado = self.request.query_params.get("procesado")

        if procesado is not None:
            is_processed = procesado.lower() == "true"
            queryset = queryset.filter(procesado=is_processed)

        return queryset.order_by("-fecha_solicitud")

    def perform_create(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"CREATE SolicitudValidacion #{obj.pk}",
            accion="CREATE",
            recurso="SolicitudValidacion",
            recurso_id=obj.pk,
            metadata={"procesado": getattr(obj, "procesado", None)},
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit_from_view(
            self.request,
            descripcion=f"UPDATE SolicitudValidacion #{obj.pk}",
            accion="UPDATE",
            recurso="SolicitudValidacion",
            recurso_id=obj.pk,
            metadata={"procesado": getattr(obj, "procesado", None)},
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        meta = {"procesado": getattr(instance, "procesado", None)}
        instance.delete()
        _audit_from_view(
            self.request,
            descripcion=f"DELETE SolicitudValidacion #{pk}",
            accion="DELETE",
            recurso="SolicitudValidacion",
            recurso_id=pk,
            metadata=meta,
        )


# 4) Sync (Self-healing) - lo dejo AllowAny como lo tenías
class SyncPacienteUserView(APIView):
    permission_classes = [InternalTokenOrAuthenticated]

    def post(self, request):
        _enforce_api_publica_for_external(request)

        documento = request.data.get("documento")
        user_id = request.data.get("user_id")

        if not documento or not user_id:
            return Response({"error": "Faltan datos críticos (doc/user_id)"}, status=status.HTTP_400_BAD_REQUEST)

        documento_norm = str(documento).strip()

        try:
            paciente = Paciente.objects.filter(numero_documento=documento_norm).first()
            if not paciente:
                paciente = Paciente.objects.filter(numero_documento__iexact=documento_norm).first()
            if not paciente:
                raise Paciente.DoesNotExist
            cambios = []

            if str(paciente.user_id) != str(user_id):
                old_user = paciente.user_id
                paciente.user_id = user_id
                paciente.save()
                cambios.append(f"Corregido user_id de {old_user} a {user_id}")

            _audit_from_view(
                request,
                descripcion=f"SYNC_PACIENTE_USER Paciente #{paciente.pk}",
                accion="SYNC_USER",
                recurso="Paciente",
                recurso_id=paciente.pk,
                metadata={"documento": documento, "user_id": user_id, "cambios": cambios},
            )

            return Response(
                {
                    "status": "found",
                    "paciente_id": paciente.id,
                    "corrected": len(cambios) > 0,
                    "details": cambios,
                },
                status=status.HTTP_200_OK,
            )

        except Paciente.DoesNotExist:
            _audit_from_view(
                request,
                descripcion="SYNC_PACIENTE_USER not_found",
                accion="SYNC_USER_NOT_FOUND",
                recurso="Paciente",
                recurso_id=None,
                metadata={"documento": documento, "user_id": user_id},
            )
            return Response({"status": "not_found"}, status=status.HTTP_404_NOT_FOUND)


# 5) Bulk info (internal) - lo dejo público para no romper llamadas de otros ms
class BulkPacienteView(APIView):
    permission_classes = [InternalTokenOrAuthenticatedReadOnly]

    def get(self, request):
        _enforce_api_publica_for_external(request)

        ids_param = request.query_params.get("ids", "")
        if not ids_param:
            return Response({})

        ids = ids_param.split(",")
        pacientes = Paciente.objects.filter(id__in=ids)

        data = {}
        for p in pacientes:
            data[str(p.id)] = {
                "nombre_completo": f"{p.nombre} {p.apellido}",
                "numero_documento": p.numero_documento,
                "tipo_doc": p.tipo_documento,
                "fecha_nacimiento": p.fecha_nacimiento.isoformat() if p.fecha_nacimiento else None,
            }
        return Response(data)
