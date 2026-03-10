import re

from django.conf import settings
from django.db import connection
from django.http import JsonResponse


SCHEMA_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,62}$")


class TenantSchemaMiddleware:
    """
    Sets PostgreSQL search_path using X-Tenant-Schema.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        requested_schema = (request.headers.get("X-Tenant-Schema") or "").strip()
        enforce = bool(getattr(settings, "TENANT_SCHEMA_ENFORCE_HEADER", False))
        require_header = bool(getattr(settings, "TENANT_SCHEMA_REQUIRE_HEADER", enforce))
        allow_public = bool(getattr(settings, "TENANT_SCHEMA_ALLOW_PUBLIC", not enforce))
        default_schema = getattr(settings, "TENANT_SCHEMA_DEFAULT", "public")
        if not requested_schema:
            if require_header:
                return JsonResponse({"detail": "missing tenant schema"}, status=403)
            schema = default_schema
        else:
            schema = requested_schema

        if not SCHEMA_RE.match(schema):
            if enforce:
                return JsonResponse({"detail": "invalid tenant schema"}, status=403)
            schema = default_schema

        if schema == "public" and not allow_public:
            return JsonResponse({"detail": "public schema not allowed"}, status=403)

        request.tenant_schema = schema

        try:
            with connection.cursor() as cursor:
                cursor.execute(f'SET search_path TO "{schema}", public')
            response = self.get_response(request)
        finally:
            with connection.cursor() as cursor:
                cursor.execute("SET search_path TO public")

        return response
