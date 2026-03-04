from __future__ import annotations

import json
import logging
from typing import Optional, Tuple

from django.http import HttpRequest
from django.urls import resolve
from django.utils import timezone

from users.models import Auditoria

logger = logging.getLogger(__name__)

AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SENSITIVE_KEYS = {"password", "token", "refresh", "access", "secret"}

# Prefijos "interesantes"
DEFAULT_AUDIT_PATH_PREFIXES = (
    "/api/v1/users/admin/",
    "/api/v1/auth/login/",
    "/api/v1/auth/register/",
    "/api/v1/auth/me/",
    "/api/v1/auth/menu/",
)

# Prefijos a excluir (evitar ruido / loops)
DEFAULT_EXCLUDE_PATH_PREFIXES = (
    "/api/v1/users/admin/auditoria/",  # evita que auditar auditoría genere auditoría infinita
    "/api/v1/auth/refresh/",
)


def _get_ip(request: HttpRequest) -> Optional[str]:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _safe_json_body(request: HttpRequest):
    """
    Si es JSON, intenta leer y sanitizar. Si falla, retorna None.
    Nota: request.body es bytes y Django lo cachea, así que leerlo aquí no rompe DRF.
    """
    try:
        ct = request.content_type or ""
        if "application/json" not in ct.lower():
            return None

        raw = request.body.decode("utf-8") if request.body else ""
        if not raw:
            return None

        body = json.loads(raw)

        # Enmascarar llaves sensibles (solo nivel 1; suficiente para login/register típicamente)
        if isinstance(body, dict):
            for k in list(body.keys()):
                if str(k).lower() in SENSITIVE_KEYS:
                    body[k] = "***"

        return body
    except Exception:
        return None


def _resolve_recurso(request: HttpRequest) -> Tuple[Optional[str], Optional[str]]:
    """
    Intenta inferir:
    - recurso: nombre de la vista/endpoint (view_name/url_name)
    - recurso_id: pk/id si viene en kwargs
    """
    match = getattr(request, "resolver_match", None)

    # fallback si resolver_match no existe en algún punto
    if match is None:
        try:
            match = resolve(request.path_info)
        except Exception:
            match = None

    if not match:
        return None, None

    recurso = match.view_name or match.url_name or None

    kwargs = getattr(match, "kwargs", {}) or {}
    recurso_id = kwargs.get("pk") or kwargs.get("id") or None
    recurso_id = str(recurso_id) if recurso_id is not None else None

    return recurso, recurso_id


class AuditoriaMiddleware:
    """
    Auditoría genérica (request/response):
    - registra ruta, método, status, usuario, ip, user-agent, duración
    - NO reemplaza auditoría semántica (para eso usa helpers específicos si quieres)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        start = timezone.now()
        response = self.get_response(request)
        duration_ms = int((timezone.now() - start).total_seconds() * 1000)

        try:
            req_path = request.path or ""
            method = request.method or "GET"

            # Excluir rutas ruidosas / loops
            if any(req_path.startswith(p) for p in DEFAULT_EXCLUDE_PATH_PREFIXES):
                return response

            is_interesting_method = method in AUDIT_METHODS
            is_interesting_path = any(req_path.startswith(p) for p in DEFAULT_AUDIT_PATH_PREFIXES)
            is_login = req_path.endswith("/login/") and method == "POST"

            # Si no es relevante, no guardamos
            if not (is_interesting_method or is_interesting_path or is_login):
                return response

            # Usuario
            uid = None
            if hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
                uid = getattr(request.user, "id", None)

            # Módulo básico por ruta (tu lógica intacta)
            modulo = "GENERAL"
            if req_path.startswith("/api/v1/users/admin/"):
                modulo = "ADMIN"
            elif (
                req_path.startswith("/api/v1/auth/login/")
                or req_path.startswith("/api/v1/auth/register/")
                or req_path.startswith("/api/v1/auth/refresh/")
            ):
                modulo = "AUTH"
            elif req_path.startswith("/api/v1/auth/menu/"):
                modulo = "MENU"
            elif req_path.startswith("/api/v1/auth/me/"):
                modulo = "PROFILE"

            # ✅ Recurso / recurso_id (arreglo que te faltaba)
            recurso, recurso_id = _resolve_recurso(request)

            accion = f"{method}_{getattr(response, 'status_code', 'NA')}"
            descripcion = f"{method} {req_path} -> {getattr(response, 'status_code', 'NA')}"

            Auditoria.objects.create(
                descripcion=descripcion,
                usuario_id=uid,
                modulo=modulo,
                accion=accion,
                ip=_get_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT"),
                metadata={
                    "duration_ms": duration_ms,
                    "query": dict(request.GET),
                    "body": _safe_json_body(request) if (method in AUDIT_METHODS or is_login) else None,
                },
                recurso=recurso,
                recurso_id=recurso_id,
            )

        except Exception as e:
            logger.exception("Error guardando auditoría: %s", e)
            # Nunca romper flujo por auditoría
            pass

        return response