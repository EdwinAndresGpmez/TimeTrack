from django.conf import settings
from rest_framework.permissions import BasePermission, SAFE_METHODS


class InternalTokenOrAuthenticatedReadOnly(BasePermission):
    """
    Permite llamadas internas (solo lectura) con X-INTERNAL-TOKEN.
    Escritura sigue requiriendo usuario autenticado por JWT.
    """

    def has_permission(self, request, view):
        token = request.headers.get("X-INTERNAL-TOKEN")
        if request.method in SAFE_METHODS and token and token == getattr(settings, "INTERNAL_SERVICE_TOKEN", None):
            return True
        return bool(getattr(request, "user", None) and request.user.is_authenticated)

