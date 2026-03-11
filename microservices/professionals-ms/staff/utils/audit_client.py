import os
import logging
from typing import Any, Dict, Optional, Union

import requests

logger = logging.getLogger(__name__)

DEFAULT_AUDIT_URL = "http://auth-ms:8000/api/v1/users/admin/auditoria/registrar/"
SENSITIVE_KEYS = {"password", "token", "refresh", "access", "secret"}

MAX_STR_LEN = 800
MAX_META_KEYS = 60


def _truncate_str(s: str) -> str:
    return s if len(s) <= MAX_STR_LEN else s[:MAX_STR_LEN] + "…(truncado)"


def _sanitize(obj: Any) -> Any:
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
    request_headers: Optional[Dict[str, Any]] = None,
) -> bool:
    audit_url = os.getenv("AUDIT_URL", DEFAULT_AUDIT_URL).strip()
    token = os.getenv("INTERNAL_AUDIT_TOKEN", "").strip()

    if not token:
        logger.warning("[audit_log] INTERNAL_AUDIT_TOKEN no configurado. Auditoría deshabilitada.")
        return False

    safe_meta = _sanitize(metadata or {})
    if isinstance(safe_meta, dict):
        safe_meta.setdefault("source_service", os.getenv("SERVICE_NAME", "professionals-ms"))

    payload: Dict[str, Any] = {
        "descripcion": _truncate_str(descripcion),
        "modulo": _truncate_str(modulo),
        "metadata": safe_meta,
    }

    if usuario_id is not None:
        try:
            payload["usuario_id"] = int(usuario_id)
        except Exception:
            pass
    if accion is not None:
        payload["accion"] = _truncate_str(str(accion))
    if ip is not None:
        payload["ip"] = ip
    if user_agent is not None:
        payload["user_agent"] = _truncate_str(str(user_agent))
    if recurso is not None:
        payload["recurso"] = _truncate_str(str(recurso))
    if recurso_id is not None:
        payload["recurso_id"] = _truncate_str(str(recurso_id))

    try:
        headers = {"X-INTERNAL-TOKEN": token, "Content-Type": "application/json"}
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

        resp = requests.post(
            audit_url,
            json=payload,
            headers=headers,
            timeout=timeout,
        )
        if resp.status_code in (200, 201):
            return True

        logger.warning(
            "[audit_log] Respuesta no OK (%s) %s - %s",
            resp.status_code,
            audit_url,
            (resp.text[:200] + "…") if resp.text else "",
        )
        return False

    except requests.RequestException as e:
        logger.warning("[audit_log] Error enviando auditoría: %s", str(e))
        return False
