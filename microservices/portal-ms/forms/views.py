from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import PermissionDenied
from core.tenant_policy import get_current_tenant_policy_public, get_feature_rule

from .models import PQRS, ConvocatoriaHV
from .serializers import (
    ConvocatoriaHVSerializer,
    PQRSSerializer,
    PQRSAdminSerializer,
    ConvocatoriaHVAdminSerializer,
)


def _portal_web_completo_enabled(request) -> bool:
    policy = get_current_tenant_policy_public(request)
    return bool(get_feature_rule(policy, "portal_web_completo").get("enabled", False))


def _pqrs_enabled(request) -> bool:
    policy = get_current_tenant_policy_public(request)
    return bool(get_feature_rule(policy, "pqrs").get("enabled", False))


class PQRSCreateView(generics.CreateAPIView):
    """
    Permite a cualquier usuario radicar una PQRS.
    """

    queryset = PQRS.objects.all()
    serializer_class = PQRSSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        if not _portal_web_completo_enabled(request):
            raise PermissionDenied(
                "Tu plan no incluye Portal Web Completo. PQRS no esta disponible en modo basico."
            )
        if not _pqrs_enabled(request):
            raise PermissionDenied(
                "Tu plan actual no incluye PQRS. Activa el modulo para radicar casos."
            )
        return super().create(request, *args, **kwargs)


class HVCreateView(generics.CreateAPIView):
    """
    Permite cargar una hoja de vida para vacantes (Trabaje con Nosotros).
    """

    queryset = ConvocatoriaHV.objects.all()
    serializer_class = ConvocatoriaHVSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        if not _portal_web_completo_enabled(request):
            raise PermissionDenied(
                "Tu plan no incluye Portal Web Completo. Trabaje con Nosotros no esta disponible en modo basico."
            )
        return super().create(request, *args, **kwargs)


class AdminRoleMixin:
    """
    Permite acceso si:
    - is_staff o is_superuser
    - o roles incluye "Administrador"
    """
    admin_role_name = "Administrador"

    def _is_admin(self, request):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False

        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return True

        roles = getattr(user, "roles", None) or []
        roles_norm = [str(r).lower() for r in roles]
        return self.admin_role_name.lower() in roles_norm

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method == "OPTIONS":
            return
        if not self._is_admin(request):
            raise PermissionDenied("No autorizado (se requiere rol Administrador / staff).")


class PQRSAdminViewSet(AdminRoleMixin, viewsets.ModelViewSet):
    queryset = PQRS.objects.all().order_by("-created_at")
    serializer_class = PQRSAdminSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method == "OPTIONS":
            return
        if not _portal_web_completo_enabled(request):
            raise PermissionDenied(
                "Tu plan no incluye Portal Web Completo. La administracion de PQRS no esta disponible."
            )
        if not _pqrs_enabled(request):
            raise PermissionDenied(
                "Tu plan actual no incluye PQRS. No puedes administrar casos desde el portal."
            )


class ConvocatoriaHVAdminViewSet(AdminRoleMixin, viewsets.ModelViewSet):
    queryset = ConvocatoriaHV.objects.all().order_by("-fecha_postulacion")
    serializer_class = ConvocatoriaHVAdminSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
