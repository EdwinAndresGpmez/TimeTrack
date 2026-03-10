import requests
from django.conf import settings
from rest_framework.exceptions import ValidationError


def _forward_headers(request):
    headers = {}
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


def get_current_tenant_policy_public(request):
    url = getattr(settings, "TENANT_POLICY_PUBLIC_URL", "")
    if not url:
        raise ValidationError({"detail": "TENANT_POLICY_PUBLIC_URL no configurado"})

    try:
        response = requests.get(
            url,
            headers=_forward_headers(request),
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

