from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChannelProviderConfig, Notificacion, NotificationTemplate
from .serializers import (
    ChannelProviderConfigSerializer,
    NotificacionSerializer,
    NotificationTemplateSerializer,
    SendNotificationSerializer,
)
from .services import (
    NON_SMS_EXTERNAL_CONNECTORS,
    active_tenant_id_from_request,
    dispatch_notification,
    get_whatsapp_qr_info,
    validate_channel_config,
)
from .utils.tenant_policy import get_current_tenant_policy, get_feature_rule


class IsTenantAdminOrSuper(permissions.BasePermission):
    def has_permission(self, request, view):
        if bool(getattr(request.user, "is_superuser", False)):
            return True
        roles = list(getattr(request.user, "roles", []) or [])
        allowed = {"Administrador", "SuperAdmin SaaS"}
        return any(r in allowed for r in roles)


def _is_saas_superadmin(request):
    if bool(getattr(request.user, "is_superuser", False)):
        return True
    roles = list(getattr(request.user, "roles", []) or [])
    return "SuperAdmin SaaS" in roles


def _resolve_tenant_id(request):
    active = active_tenant_id_from_request(request)
    requested = request.query_params.get("tenant_id")
    if requested in (None, "") and hasattr(request, "data"):
        requested = request.data.get("tenant_id")

    if requested in (None, ""):
        return active
    try:
        requested_int = int(requested)
    except (TypeError, ValueError):
        return active

    if _is_saas_superadmin(request):
        return requested_int
    return active


def _enforce_integraciones_non_sms(policy, cfg: ChannelProviderConfig):
    if cfg.channel not in NON_SMS_EXTERNAL_CONNECTORS:
        return
    if cfg.channel == ChannelProviderConfig.Channel.EMAIL and cfg.sender_mode == ChannelProviderConfig.SenderMode.SHARED:
        return
    if cfg.channel == ChannelProviderConfig.Channel.WHATSAPP_META and cfg.sender_mode == ChannelProviderConfig.SenderMode.SHARED:
        return

    integraciones_rule = get_feature_rule(policy, "integraciones")
    if integraciones_rule and not bool(integraciones_rule.get("enabled", False)):
        raise PermissionDenied("Tu plan no incluye Integraciones externas para este conector.")


class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notificacion.objects.all()
        tenant_id = active_tenant_id_from_request(self.request)
        if tenant_id is not None:
            queryset = queryset.filter(tenant_id=tenant_id)

        usuario_id = self.request.query_params.get("usuario_id")
        if usuario_id:
            queryset = queryset.filter(usuario_id=usuario_id)
        return queryset

    def perform_create(self, serializer):
        tenant_id = active_tenant_id_from_request(self.request)
        serializer.save(tenant_id=tenant_id, estado=Notificacion.Estado.PENDING)

    @action(detail=True, methods=["patch"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.leida = True
        notif.save(update_fields=["leida", "updated_at"])
        return Response({"detail": "ok"})


class ChannelProviderConfigViewSet(viewsets.ModelViewSet):
    serializer_class = ChannelProviderConfigSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantAdminOrSuper]
    filterset_fields = ["channel", "sender_mode", "is_active", "is_default"]

    def get_queryset(self):
        tenant_id = _resolve_tenant_id(self.request)
        qs = ChannelProviderConfig.objects.all()
        if tenant_id is not None:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        tenant_id = _resolve_tenant_id(self.request)
        serializer.save(tenant_id=tenant_id, created_by=getattr(self.request.user, "id", None), updated_by=getattr(self.request.user, "id", None))

    def perform_update(self, serializer):
        serializer.save(updated_by=getattr(self.request.user, "id", None))

    @action(detail=True, methods=["post"], url_path="test-connection")
    def test_connection(self, request, pk=None):
        cfg = self.get_object()
        tenant_id = _resolve_tenant_id(request)
        policy = get_current_tenant_policy(request, tenant_id=tenant_id)
        _enforce_integraciones_non_sms(policy, cfg)
        result = validate_channel_config(cfg)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="qr-info")
    def qr_info(self, request, pk=None):
        cfg = self.get_object()
        tenant_id = _resolve_tenant_id(request)
        policy = get_current_tenant_policy(request, tenant_id=tenant_id)
        _enforce_integraciones_non_sms(policy, cfg)
        result = get_whatsapp_qr_info(cfg)
        return Response(result, status=status.HTTP_200_OK)


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantAdminOrSuper]
    filterset_fields = ["code", "channel", "is_active"]

    def get_queryset(self):
        tenant_id = _resolve_tenant_id(self.request)
        qs = NotificationTemplate.objects.all()
        if tenant_id is not None:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        tenant_id = _resolve_tenant_id(self.request)
        serializer.save(tenant_id=tenant_id, created_by=getattr(self.request.user, "id", None), updated_by=getattr(self.request.user, "id", None))

    def perform_update(self, serializer):
        serializer.save(updated_by=getattr(self.request.user, "id", None))


class NotificationDispatchView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantAdminOrSuper]

    def post(self, request):
        try:
            serializer = SendNotificationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            tenant_id = _resolve_tenant_id(request)
            policy = get_current_tenant_policy(request, tenant_id=tenant_id)
            notif = dispatch_notification(
                request=request,
                policy=policy,
                payload=serializer.validated_data,
                tenant_id=tenant_id,
            )
            return Response(NotificacionSerializer(notif).data, status=status.HTTP_201_CREATED)
        except PermissionDenied:
            raise
        except ValidationError:
            raise
        except Exception as exc:
            # Fallback para no exponer 500 opaco en UI.
            return Response(
                {"detail": f"Error interno en dispatch: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
