from django.conf import settings
from rest_framework.permissions import BasePermission, SAFE_METHODS


class InternalTokenOrAuthenticated(BasePermission):
    """
    Permite requests internas con X-INTERNAL-TOKEN o usuarios autenticados por JWT.
    """

    def has_permission(self, request, view):
        token = request.headers.get("X-INTERNAL-TOKEN")
        if token and token == getattr(settings, "INTERNAL_SERVICE_TOKEN", None):
            return True
        return bool(getattr(request, "user", None) and request.user.is_authenticated)


class InternalTokenOrAuthenticatedReadOnly(BasePermission):
    """
    Token interno solo para lectura. Escritura requiere usuario autenticado.
    """

    def has_permission(self, request, view):
        token = request.headers.get("X-INTERNAL-TOKEN")
        if request.method in SAFE_METHODS and token and token == getattr(settings, "INTERNAL_SERVICE_TOKEN", None):
            return True
        return bool(getattr(request, "user", None) and request.user.is_authenticated)

