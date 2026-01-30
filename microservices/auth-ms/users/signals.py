from django.db.models.signals import post_save
from django.contrib.auth.models import Group  # <--- IMPORTANTE
from django.dispatch import receiver
from .models import CrearCuenta
import requests
import logging

logger = logging.getLogger(__name__)

# --- CORRECCIÓN DE PUERTOS: Usamos 8001 para patients-ms ---
PATIENTS_SERVICE_URL = "http://patients-ms:8001/api/v1/pacientes/internal/sync-user/"
SOLICITUDES_URL = "http://patients-ms:8001/api/v1/pacientes/solicitudes/"


@receiver(post_save, sender=CrearCuenta)
def sincronizar_paciente(sender, instance, created, **kwargs):
    # --- PARTE 1: ASIGNACIÓN DE GRUPO AUTOMÁTICA ---
    # Si ya tiene un paciente_id (validado por admin o self-healing),
    # le damos permisos de "paciente".
    if instance.paciente_id:
        try:
            # Obtenemos o creamos el grupo para evitar errores
            grupo_paciente, _ = Group.objects.get_or_create(name="Paciente")

            # Si el usuario no está en el grupo, lo agregamos
            if not instance.groups.filter(name="Paciente").exists():
                instance.groups.add(grupo_paciente)
                logger.info(
                    f"Usuario {instance.id} ({instance.nombre}) asignado al grupo 'Paciente' automáticamente."
                )
        except Exception as e:
            logger.error(f"Error asignando grupo 'Paciente': {e}")

    # --- PARTE 2: SINCRONIZACIÓN CON PATIENTS-MS ---
    # La lógica sigue igual, solo cambiaron las URLs arriba
    if not instance.paciente_id:
        try:
            payload = {"documento": instance.documento, "user_id": instance.id}

            # 1. Intentamos vincular
            response = requests.post(PATIENTS_SERVICE_URL, json=payload, timeout=3)

            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "found":
                    CrearCuenta.objects.filter(id=instance.id).update(
                        paciente_id=data["paciente_id"]
                    )
                    logger.info(f"Usuario {instance.id} vinculado automáticamente.")

            elif response.status_code == 404:
                # 2. Creamos solicitud
                logger.info(
                    f"Usuario {instance.documento} no es paciente. Creando solicitud..."
                )

                try:
                    payload_solicitud = {
                        "user_id": instance.id,
                        "nombre": instance.nombre,
                        "email": instance.correo,
                        "user_doc": instance.documento,
                        "procesado": False,
                    }
                    resp_sol = requests.post(
                        SOLICITUDES_URL, json=payload_solicitud, timeout=3
                    )

                    if resp_sol.status_code == 201:
                        logger.info("Solicitud creada exitosamente.")
                    else:
                        logger.warning(
                            f"Error creando solicitud: {resp_sol.status_code}"
                        )
                except Exception as e_sol:
                    logger.error(f"Error secundario: {str(e_sol)}")

        except Exception as e:
            logger.error(f"Error de conexión con Patients-MS (8001): {str(e)}")
