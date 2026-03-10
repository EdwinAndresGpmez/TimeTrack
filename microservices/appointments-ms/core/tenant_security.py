import hmac
from hashlib import sha256

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone


class TenantSignatureMiddleware:
    """
    Validates tenant headers propagated by the gateway.
    It can run in soft mode or strict mode via TENANT_SIGNATURE_REQUIRED.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant_id = request.headers.get("X-Tenant-ID")
        tenant_domain = request.headers.get("X-Tenant-Domain") or request.get_host().split(":")[0]
        tenant_signature = request.headers.get("X-Tenant-Signature")
        tenant_ts = request.headers.get("X-Tenant-Timestamp")

        request.tenant_id = None
        request.tenant_domain = tenant_domain
        request.tenant_signature_valid = False

        required = bool(getattr(settings, "TENANT_SIGNATURE_REQUIRED", False))
        signing_key = getattr(settings, "TENANT_HEADER_SIGNING_KEY", "") or ""
        max_skew = int(getattr(settings, "TENANT_SIGNATURE_MAX_SKEW_SEC", 300))
        allow_unresolved_hosts = set(
            getattr(settings, "TENANT_ALLOW_UNRESOLVED_HOSTS", ["localhost", "127.0.0.1"])
        )

        if not tenant_id:
            if required and tenant_domain not in allow_unresolved_hosts:
                return JsonResponse({"detail": "missing tenant headers"}, status=403)
            return self.get_response(request)

        try:
            tenant_id_int = int(tenant_id)
        except (TypeError, ValueError):
            if required:
                return JsonResponse({"detail": "invalid tenant id"}, status=403)
            return self.get_response(request)

        if not (tenant_signature and tenant_ts and signing_key):
            if required:
                return JsonResponse({"detail": "missing tenant signature"}, status=403)
            request.tenant_id = tenant_id_int
            return self.get_response(request)

        try:
            ts_int = int(tenant_ts)
        except (TypeError, ValueError):
            if required:
                return JsonResponse({"detail": "invalid tenant timestamp"}, status=403)
            request.tenant_id = tenant_id_int
            return self.get_response(request)

        now_ts = int(timezone.now().timestamp())
        if abs(now_ts - ts_int) > max_skew:
            if required:
                return JsonResponse({"detail": "tenant signature expired"}, status=403)
            request.tenant_id = tenant_id_int
            return self.get_response(request)

        payload = f"{tenant_id_int}:{tenant_domain}:{ts_int}".encode("utf-8")
        expected = hmac.new(signing_key.encode("utf-8"), payload, sha256).hexdigest()

        valid = hmac.compare_digest(expected, tenant_signature)
        request.tenant_id = tenant_id_int
        request.tenant_signature_valid = valid

        if required and not valid:
            return JsonResponse({"detail": "invalid tenant signature"}, status=403)

        return self.get_response(request)
