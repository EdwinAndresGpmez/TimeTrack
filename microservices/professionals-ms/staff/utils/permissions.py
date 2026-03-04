from django.conf import settings
from rest_framework.permissions import BasePermission


class InternalTokenOrAuthenticated(BasePermission):
    """
    Permite:
    - Requests internas con X-INTERNAL-TOKEN válido
    - o requests de usuario autenticado (Bearer JWT)
    """
    def has_permission(self, request, view):
        token = request.headers.get("X-INTERNAL-TOKEN")
        if token and token == getattr(settings, "INTERNAL_SERVICE_TOKEN", None):
            return True

        return bool(getattr(request, "user", None) and request.user.is_authenticated)