from __future__ import annotations

from typing import Any, Optional, Dict, Union

from django.http import HttpRequest

from users.models import Auditoria

SENSITIVE_KEYS = {"password", "token", "refresh", "access", "secret"}


def _get_ip(request: HttpRequest) -> Optional[str]:
    """
    Extrae IP considerando proxies.
    Si usas proxy/balancer, asegúrate de configurar Django para confiar en X-Forwarded-For.
    """
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _coerce_json_safe(value: Any) -> Any:
    """
    Intenta devolver un objeto razonablemente JSON-serializable.
    Si no puede, lo convierte a string.
    """
    try:
        # Tipos simples OK
        if value is None or isinstance(value, (bool, int, float, str)):
            return value

        # Dict: procesar recursivo
        if isinstance(value, dict):
            return {str(k): _coerce_json_safe(v) for k, v in value.items()}

        # List/Tuple/Set: procesar recursivo (set -> list)
        if isinstance(value, (list, tuple, set)):
            return [_coerce_json_safe(v) for v in list(value)]

        # Otros objetos: fallback a string
        return str(value)
    except Exception:
        return str(value)


def _sanitize_metadata(metadata: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Evita guardar secretos por accidente en metadata.
    Sanitiza de forma recursiva (dict/list).
    """
    if metadata is None:
        return None

    # Asegurar que sea dict
    if not isinstance(metadata, dict):
        # si te pasan otra cosa, la envolvemos
        return {"value": _coerce_json_safe(metadata)}

    def walk(obj: Any) -> Any:
        if isinstance(obj, dict):
            clean: Dict[str, Any] = {}
            for k, v in obj.items():
                key = str(k)
                if key.lower() in SENSITIVE_KEYS:
                    clean[key] = "***"
                else:
                    clean[key] = walk(v)
            return clean

        if isinstance(obj, list):
            return [walk(x) for x in obj]

        return _coerce_json_safe(obj)

    return walk(metadata)


def guardar_auditoria(
    request: Optional[HttpRequest],
    descripcion: str,
    modulo: str = "GENERAL",
    accion: Optional[str] = None,
    recurso: Optional[str] = None,
    recurso_id: Optional[Union[str, int]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    usuario_id: Optional[int] = None,
) -> Auditoria:
    """
    Guarda un registro de auditoría directo en BD (auth-ms).

    - request: puede ser None (ej: tareas internas)
    - usuario_id: si no se pasa, se intenta tomar de request.user
    - metadata: dict JSON serializable (sanitizado)
    """
    uid = usuario_id
    if (
        uid is None
        and request is not None
        and hasattr(request, "user")
        and getattr(request.user, "is_authenticated", False)
    ):
        uid = request.user.id

    ip = _get_ip(request) if request is not None else None
    user_agent = request.META.get("HTTP_USER_AGENT") if request is not None else None

    rid = str(recurso_id) if recurso_id is not None else None

    return Auditoria.objects.create(
        descripcion=descripcion,
        usuario_id=uid,
        modulo=modulo,
        accion=accion,
        ip=ip,
        user_agent=user_agent,
        metadata=_sanitize_metadata(metadata),
        recurso=recurso,
        recurso_id=rid,
    )