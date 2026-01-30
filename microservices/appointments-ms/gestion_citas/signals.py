from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Cita, HistoricoCita


@receiver(post_save, sender=Cita)
def registrar_historico(sender, instance, created, **kwargs):
    """
    Se ejecuta automáticamente cada vez que se crea o actualiza una Cita.
    Crea una copia de los datos relevantes en HistoricoCita.
    """
    try:
        HistoricoCita.objects.create(
            cita=instance,
            estado_anterior="N/A" if created else "DESCONOCIDO",  # Podríamos mejorar esto con pre_save si fuera crítico
            estado_nuevo=instance.estado,
            fecha_cambio=instance.updated_at if hasattr(instance, "updated_at") else instance.created_at,
            observacion=f"Registro automático: {'Creación' if created else 'Actualización'} de cita.",
        )
    except Exception as e:
        # Es importante capturar errores aquí para no romper el flujo principal de la cita
        print(f"Error generando histórico: {e}")
