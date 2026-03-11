import os
import logging
from typing import Any, Dict, Optional, Union

import requests

logger = logging.getLogger(__name__)

DEFAULT_AUDIT_URL = "http://auth-ms:8000/api/v1/users/admin/auditoria/registrar/"
SENSITIVE_KEYS = {"password", "token", "refresh", "access", "secret"}

# Para evitar meter payloads gigantes a la DB (y al auth-ms)
MAX_STR_LEN = 800
MAX_META_KEYS = 60


def _truncate_str(s: str) -> str:
    if len(s) <= MAX_STR_LEN:
        return s
    return s[:MAX_STR_LEN] + "…(truncado)"


def _sanitize(obj: Any) -> Any:
    """
    - Enmascara keys sensibles
    - Trunca strings largas
    - Limita tamaño de dict
    """
    try:
        if isinstance(obj, dict):
            clean = {}
            for i, (k, v) in enumerate(obj.items()):
                if i >= MAX_META_KEYS:
                    clean["__truncado__"] = f"Metadata excede {MAX_META_KEYS} keys"
                    break

                if str(k).lower() in SENSITIVE_KEYS:
                    clean[k] = "***"
                else:
                    clean[k] = _sanitize(v)
            return clean

        if isinstance(obj, list):
            limited = obj[:50]
            return [_sanitize(x) for x in limited] + (["…(lista truncada)"] if len(obj) > 50 else [])

        if isinstance(obj, str):
            return _truncate_str(obj)

        return obj
    except Exception:
        return obj


def _safe_int(value: Any) -> Optional[int]:
    """Convierte a int si se puede; si no, None."""
    if value is None:
        return None
    try:
        # evita bool (True/False) que también es int en Python
        if isinstance(value, bool):
            return None
        return int(value)
    except Exception:
        return None


def _safe_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    try:
        s = str(value)
        return _truncate_str(s)
    except Exception:
        return None


def audit_log(
    *,
    descripcion: str,
    modulo: str,
    accion: Optional[str] = None,
    usuario_id: Optional[Union[int, str]] = None,
    recurso: Optional[str] = None,
    recurso_id: Optional[Union[str, int]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    timeout: int = 2,
    request_id: Optional[str] = None,
    request_headers: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Emite evento a auth-ms. Si falla, NO rompe flujo.
    Ajustes:
    - Normaliza usuario_id/recurso_id
    - Agrega Content-Type
    - No envía campos None (reduce errores de validación en serializer)
    """
    audit_url = os.getenv("AUDIT_URL", DEFAULT_AUDIT_URL).strip()
    token = os.getenv("INTERNAL_AUDIT_TOKEN", "").strip()

    if not token:
        logger.warning("[audit_log] INTERNAL_AUDIT_TOKEN no configurado. Auditoría deshabilitada.")
        return False

    safe_meta = _sanitize(metadata or {})

    # tag del emisor
    if isinstance(safe_meta, dict):
        safe_meta.setdefault("source_service", os.getenv("SERVICE_NAME", "appointments-ms"))
        if request_id:
            safe_meta.setdefault("request_id", request_id)

    # Normalización de IDs
    uid = _safe_int(usuario_id)
    rid = _safe_str(recurso_id)

    # Construcción del payload (evitar mandar None si el serializer no acepta null)
    payload: Dict[str, Any] = {
        "descripcion": _truncate_str(descripcion),
        "modulo": _truncate_str(modulo) if isinstance(modulo, str) else modulo,
        "metadata": safe_meta,
    }

    # Solo agregamos si viene (reduce validaciones "null not allowed")
    if uid is not None:
        payload["usuario_id"] = uid
    if accion is not None:
        payload["accion"] = _truncate_str(accion) if isinstance(accion, str) else accion
    if ip is not None:
        payload["ip"] = ip
    if user_agent is not None:
        payload["user_agent"] = _truncate_str(user_agent) if isinstance(user_agent, str) else user_agent
    if recurso is not None:
        payload["recurso"] = _truncate_str(recurso) if isinstance(recurso, str) else recurso
    if rid is not None:
        payload["recurso_id"] = rid

    headers = {
        "X-INTERNAL-TOKEN": token,              # ✅ coincide con Auth
        "Content-Type": "application/json",     # ✅ ayuda con proxies/validaciones
    }
    for key in (
        "X-Tenant-ID",
        "X-Tenant-Domain",
        "X-Tenant-Signature",
        "X-Tenant-Timestamp",
        "X-Tenant-Schema",
        "X-Tenant-Slug-Override",
    ):
        value = (request_headers or {}).get(key)
        if value:
            headers[key] = value
    if request_id:
        headers["X-Request-ID"] = request_id

    try:
        resp = requests.post(
            audit_url,
            json=payload,
            headers=headers,
            timeout=timeout,
        )

        if resp.status_code in (200, 201):
            return True

        logger.warning(
            "[audit_log] Respuesta no OK (%s) %s - %s | payload_keys=%s",
            resp.status_code,
            audit_url,
            (resp.text[:200] + "…") if resp.text else "",
            list(payload.keys()),
        )
        return False

    except requests.RequestException as e:
        logger.warning("[audit_log] Error enviando auditoría: %s", str(e))
        return False
