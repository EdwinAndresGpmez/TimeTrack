import logging
import os
import hmac
import time
from hashlib import sha256

import requests
from django.contrib.auth.models import Group
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CrearCuenta, TenantMembership

logger = logging.getLogger(__name__)

PATIENTS_SERVICE_URL = "http://patients-ms:8001/api/v1/pacientes/internal/sync-user/"
SOLICITUDES_URL = "http://patients-ms:8001/api/v1/pacientes/solicitudes/"


def _infer_tenant_schema(tenant_slug: str | None) -> str | None:
    if not tenant_slug:
        return None
    normalized = str(tenant_slug).strip().lower().replace("-", "_")
    if not normalized:
        return None
    return f"tenant_{normalized}"


def _resolve_membership_context(user: CrearCuenta):
    tenant_id = getattr(user, "tenant_id", None)
    membership = None
    if tenant_id:
        membership = (
            TenantMembership.objects.filter(user=user, tenant_id=tenant_id, is_active=True)
            .order_by("-is_default", "id")
            .first()
        )
    if not membership:
        membership = (
            TenantMembership.objects.filter(user=user, is_active=True)
            .order_by("-is_default", "tenant_id", "id")
            .first()
        )
    if not membership:
        return None
    return {
        "tenant_id": membership.tenant_id,
        "tenant_slug": membership.tenant_slug,
        "tenant_schema": _infer_tenant_schema(membership.tenant_slug),
    }


def _internal_headers(user: CrearCuenta | None = None):
    token = os.getenv("INTERNAL_SERVICE_TOKEN", "").strip()
    headers = {"X-INTERNAL-TOKEN": token} if token else {}

    if not user:
        return headers

    tenant_ctx = _resolve_membership_context(user)
    if not tenant_ctx:
        return headers

    tenant_id = tenant_ctx.get("tenant_id")
    tenant_slug = tenant_ctx.get("tenant_slug")
    tenant_schema = tenant_ctx.get("tenant_schema")
    if not tenant_id:
        return headers

    domain = os.getenv("TENANT_INTERNAL_DOMAIN", "auth-ms").strip() or "auth-ms"
    ts = int(time.time())
    signing_key = os.getenv("TENANT_HEADER_SIGNING_KEY", "").strip()

    headers["X-Tenant-ID"] = str(tenant_id)
    headers["X-Tenant-Domain"] = domain
    headers["X-Tenant-Timestamp"] = str(ts)
    if tenant_slug:
        headers["X-Tenant-Slug-Override"] = tenant_slug
    if tenant_schema:
        headers["X-Tenant-Schema"] = tenant_schema

    if signing_key:
        payload = f"{tenant_id}:{domain}:{ts}".encode("utf-8")
        headers["X-Tenant-Signature"] = hmac.new(signing_key.encode("utf-8"), payload, sha256).hexdigest()

    return headers


@receiver(post_save, sender=CrearCuenta)
def sincronizar_paciente(sender, instance, created, **kwargs):
    # Si ya tiene paciente_id, aseguramos grupo Paciente.
    if instance.paciente_id:
        try:
            grupo_paciente, _ = Group.objects.get_or_create(name="Paciente")
            if not instance.groups.filter(name="Paciente").exists():
                instance.groups.add(grupo_paciente)
                logger.info(
                    f"Usuario {instance.id} ({instance.nombre_completo}) asignado al grupo 'Paciente' automaticamente."
                )
        except Exception as e:
            logger.error(f"Error asignando grupo 'Paciente': {e}")

    # Si no tiene paciente, intentamos sync y luego solicitud.
    if not instance.paciente_id:
        try:
            payload = {"documento": instance.documento, "user_id": instance.id}
            response = requests.post(
                PATIENTS_SERVICE_URL,
                json=payload,
                timeout=3,
                headers=_internal_headers(instance),
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "found":
                    CrearCuenta.objects.filter(id=instance.id).update(paciente_id=data["paciente_id"])
                    logger.info(f"Usuario {instance.id} vinculado automaticamente.")

            elif response.status_code == 404:
                logger.info(f"Usuario {instance.documento} no es paciente. Creando solicitud...")
                try:
                    payload_solicitud = {
                        "user_id": instance.id,
                        "nombre": instance.nombre_completo,
                        "email": instance.correo,
                        "user_doc": instance.documento,
                        "procesado": False,
                    }
                    resp_sol = requests.post(
                        SOLICITUDES_URL,
                        json=payload_solicitud,
                        timeout=3,
                        headers=_internal_headers(instance),
                    )

                    if resp_sol.status_code == 201:
                        logger.info("Solicitud creada exitosamente.")
                    else:
                        logger.warning(f"Error creando solicitud: {resp_sol.status_code}")
                except Exception as e_sol:
                    logger.error(f"Error secundario: {str(e_sol)}")

        except Exception as e:
            logger.error(f"Error de conexion con Patients-MS (8001): {str(e)}")
