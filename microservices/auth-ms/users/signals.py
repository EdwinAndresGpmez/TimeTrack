import logging
import os

import requests
from django.contrib.auth.models import Group
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CrearCuenta

logger = logging.getLogger(__name__)

PATIENTS_SERVICE_URL = "http://patients-ms:8001/api/v1/pacientes/internal/sync-user/"
SOLICITUDES_URL = "http://patients-ms:8001/api/v1/pacientes/solicitudes/"


def _internal_headers():
    token = os.getenv("INTERNAL_SERVICE_TOKEN", "").strip()
    return {"X-INTERNAL-TOKEN": token} if token else {}


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
                headers=_internal_headers(),
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
                        headers=_internal_headers(),
                    )

                    if resp_sol.status_code == 201:
                        logger.info("Solicitud creada exitosamente.")
                    else:
                        logger.warning(f"Error creando solicitud: {resp_sol.status_code}")
                except Exception as e_sol:
                    logger.error(f"Error secundario: {str(e_sol)}")

        except Exception as e:
            logger.error(f"Error de conexion con Patients-MS (8001): {str(e)}")
