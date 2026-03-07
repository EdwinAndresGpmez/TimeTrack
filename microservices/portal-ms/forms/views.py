from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import PermissionDenied

from .models import PQRS, ConvocatoriaHV
from .serializers import (
    ConvocatoriaHVSerializer,
    PQRSSerializer,
    PQRSAdminSerializer,
    ConvocatoriaHVAdminSerializer,
)


class PQRSCreateView(generics.CreateAPIView):
    """
    Permite a cualquier usuario radicar una PQRS.
    """

    queryset = PQRS.objects.all()
    serializer_class = PQRSSerializer
    permission_classes = [AllowAny]


class HVCreateView(generics.CreateAPIView):
    """
    Permite cargar una hoja de vida para vacantes (Trabaje con Nosotros).
    """

    queryset = ConvocatoriaHV.objects.all()
    serializer_class = ConvocatoriaHVSerializer
    permission_classes = [AllowAny]


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


class ConvocatoriaHVAdminViewSet(AdminRoleMixin, viewsets.ModelViewSet):
    queryset = ConvocatoriaHV.objects.all().order_by("-fecha_postulacion")
    serializer_class = ConvocatoriaHVAdminSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
