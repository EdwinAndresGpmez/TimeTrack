import hmac
from hashlib import sha256

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError


def _forward_headers(request):
    headers = {}
    if request.headers.get("Authorization"):
        headers["Authorization"] = request.headers.get("Authorization")
    for key in [
        "X-Tenant-ID",
        "X-Tenant-Domain",
        "X-Tenant-Signature",
        "X-Tenant-Timestamp",
        "X-Tenant-Schema",
    ]:
        value = request.headers.get(key)
        if value:
            headers[key] = value
    return headers


def _signed_tenant_headers(request, tenant_id: int):
    domain = (request.headers.get("X-Tenant-Domain") or request.get_host().split(":")[0] or "localhost").strip().lower()
    ts = int(timezone.now().timestamp())
    payload = f"{tenant_id}:{domain}:{ts}".encode("utf-8")
    signature = hmac.new(
        (settings.TENANT_HEADER_SIGNING_KEY or "").encode("utf-8"),
        payload,
        sha256,
    ).hexdigest()
    return {
        "X-Tenant-ID": str(tenant_id),
        "X-Tenant-Domain": domain,
        "X-Tenant-Timestamp": str(ts),
        "X-Tenant-Signature": signature,
    }


def get_current_tenant_policy(request, tenant_id=None):
    url = getattr(settings, "TENANT_POLICY_URL", "")
    if not url:
        raise ValidationError({"detail": "TENANT_POLICY_URL no configurado"})

    headers = _forward_headers(request)
    if tenant_id not in (None, ""):
        try:
            tenant_id_int = int(tenant_id)
        except (TypeError, ValueError):
            raise ValidationError({"detail": "tenant_id invalido para policy"})
        headers.update(_signed_tenant_headers(request, tenant_id_int))

    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=int(getattr(settings, "TENANT_POLICY_TIMEOUT_SEC", 5)),
        )
    except requests.RequestException as exc:
        raise ValidationError({"detail": f"No se pudo validar plan del tenant: {exc}"}) from exc

    if response.status_code != 200:
        detail = response.text
        try:
            detail = response.json().get("detail") or detail
        except Exception:
            pass
        raise ValidationError({"detail": f"No se pudo validar plan del tenant ({response.status_code}): {detail}"})

    return response.json()


def get_feature_rule(policy: dict, code: str):
    return (policy.get("features") or {}).get(code) or {}
