from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from .models import Disponibilidad, BloqueoAgenda
from .utils.audit_client import audit_log


def _audit(*, descripcion, accion, recurso, recurso_id=None, metadata=None, usuario_id=None):
    """
    Auditoría desde signals (sin request):
    - ip/user_agent quedan None por diseño.
    - usuario_id viene desde el modelo (seteado en views).
    """
    audit_log(
        descripcion=descripcion,
        modulo="SCHEDULE",
        accion=accion,
        usuario_id=usuario_id,
        recurso=recurso,
        recurso_id=str(recurso_id) if recurso_id is not None else None,
        metadata=(metadata or {}) | {"source": "signal"},
        ip=None,
        user_agent=None,
    )


# -------------------------
# DISPONIBILIDAD
# -------------------------
@receiver(pre_save, sender=Disponibilidad)
def disponibilidad_pre_save(sender, instance: Disponibilidad, **kwargs):
    """
    Snapshot del estado anterior para detectar cambios.
    """
    if not instance.pk:
        instance._old = None
        return

    try:
        instance._old = Disponibilidad.objects.get(pk=instance.pk)
    except Disponibilidad.DoesNotExist:
        instance._old = None


@receiver(post_save, sender=Disponibilidad)
def disponibilidad_post_save(sender, instance: Disponibilidad, created: bool, **kwargs):
    accion = "CREATE" if created else "UPDATE"
    uid = getattr(instance, "usuario_id", None)

    meta_actual = {
        "id": instance.pk,
        "usuario_id": uid,
        "profesional_id": instance.profesional_id,
        "lugar_id": instance.lugar_id,
        "servicio_id": instance.servicio_id,
        "dia_semana": instance.dia_semana,
        "hora_inicio": str(instance.hora_inicio),
        "hora_fin": str(instance.hora_fin),
        "fecha": str(instance.fecha) if instance.fecha else None,
        "fecha_fin_vigencia": str(instance.fecha_fin_vigencia) if instance.fecha_fin_vigencia else None,
        "activo": instance.activo,
        "tipo": "RECURRENTE" if instance.fecha is None else "ESPECIFICA",
    }

    # Registro principal por save
    _audit(
        descripcion=f"{accion} Disponibilidad #{instance.pk}",
        accion=accion,
        recurso="Disponibilidad",
        recurso_id=instance.pk,
        metadata=meta_actual,
        usuario_id=uid,
    )

    # Si es update, detectamos deltas (útil para el "soft delete" de series)
    old = getattr(instance, "_old", None)
    if not old:
        return

    changed = {}
    campos = [
        "usuario_id",
        "profesional_id",
        "lugar_id",
        "servicio_id",
        "dia_semana",
        "hora_inicio",
        "hora_fin",
        "fecha",
        "fecha_fin_vigencia",
        "activo",
    ]

    for f in campos:
        ov = getattr(old, f, None)
        nv = getattr(instance, f, None)
        if ov != nv:
            changed[f] = {
                "from": str(ov) if ov is not None else None,
                "to": str(nv) if nv is not None else None,
            }

    if not changed:
        return

    # Evento específico: serie finalizada (tu destroy recurrente hace esto)
    if (
        "fecha_fin_vigencia" in changed
        and old.fecha_fin_vigencia is None
        and instance.fecha_fin_vigencia is not None
        and instance.fecha is None
    ):
        _audit(
            descripcion=f"SERIE_FINALIZADA Disponibilidad #{instance.pk} (vigente hasta {instance.fecha_fin_vigencia})",
            accion="SERIES_END",
            recurso="Disponibilidad",
            recurso_id=instance.pk,
            usuario_id=uid,
            metadata={
                "usuario_id": uid,
                "profesional_id": instance.profesional_id,
                "dia_semana": instance.dia_semana,
                "hora_inicio": str(instance.hora_inicio),
                "hora_fin": str(instance.hora_fin),
                "vigente_hasta": str(instance.fecha_fin_vigencia),
                "changed": {"fecha_fin_vigencia": changed["fecha_fin_vigencia"]},
            },
        )
        return

    # Evento específico: activo cambia
    if "activo" in changed:
        _audit(
            descripcion=f"STATE Disponibilidad #{instance.pk}: activo {old.activo} -> {instance.activo}",
            accion="STATE_CHANGE",
            recurso="Disponibilidad",
            recurso_id=instance.pk,
            usuario_id=uid,
            metadata={"changed": {"activo": changed["activo"]}},
        )

    # Delta general
    _audit(
        descripcion=f"UPDATE_DETALLE Disponibilidad #{instance.pk}",
        accion="UPDATE_DETAIL",
        recurso="Disponibilidad",
        recurso_id=instance.pk,
        usuario_id=uid,
        metadata={"changed": changed},
    )


@receiver(post_delete, sender=Disponibilidad)
def disponibilidad_post_delete(sender, instance: Disponibilidad, **kwargs):
    uid = getattr(instance, "usuario_id", None)

    _audit(
        descripcion=f"DELETE Disponibilidad #{instance.pk}",
        accion="DELETE",
        recurso="Disponibilidad",
        recurso_id=instance.pk,
        usuario_id=uid,
        metadata={
            "id": instance.pk,
            "usuario_id": uid,
            "profesional_id": instance.profesional_id,
            "lugar_id": instance.lugar_id,
            "servicio_id": instance.servicio_id,
            "dia_semana": instance.dia_semana,
            "hora_inicio": str(instance.hora_inicio),
            "hora_fin": str(instance.hora_fin),
            "fecha": str(instance.fecha) if instance.fecha else None,
            "fecha_fin_vigencia": str(instance.fecha_fin_vigencia) if instance.fecha_fin_vigencia else None,
            "activo": instance.activo,
            "tipo": "RECURRENTE" if instance.fecha is None else "ESPECIFICA",
        },
    )


# -------------------------
# BLOQUEO AGENDA
# -------------------------
@receiver(pre_save, sender=BloqueoAgenda)
def bloqueo_pre_save(sender, instance: BloqueoAgenda, **kwargs):
    if not instance.pk:
        instance._old = None
        return
    try:
        instance._old = BloqueoAgenda.objects.get(pk=instance.pk)
    except BloqueoAgenda.DoesNotExist:
        instance._old = None


@receiver(post_save, sender=BloqueoAgenda)
def bloqueo_post_save(sender, instance: BloqueoAgenda, created: bool, **kwargs):
    accion = "CREATE" if created else "UPDATE"
    uid = getattr(instance, "usuario_id", None)

    meta_actual = {
        "id": instance.pk,
        "usuario_id": uid,
        "profesional_id": instance.profesional_id,
        "fecha_inicio": str(instance.fecha_inicio),
        "fecha_fin": str(instance.fecha_fin),
        "motivo": instance.motivo,
    }

    _audit(
        descripcion=f"{accion} BloqueoAgenda #{instance.pk}",
        accion=accion,
        recurso="BloqueoAgenda",
        recurso_id=instance.pk,
        metadata=meta_actual,
        usuario_id=uid,
    )

    old = getattr(instance, "_old", None)
    if not old:
        return

    changed = {}
    for f in ["usuario_id", "profesional_id", "fecha_inicio", "fecha_fin", "motivo"]:
        ov = getattr(old, f, None)
        nv = getattr(instance, f, None)
        if ov != nv:
            changed[f] = {
                "from": str(ov) if ov is not None else None,
                "to": str(nv) if nv is not None else None,
            }

    if changed:
        _audit(
            descripcion=f"UPDATE_DETALLE BloqueoAgenda #{instance.pk}",
            accion="UPDATE_DETAIL",
            recurso="BloqueoAgenda",
            recurso_id=instance.pk,
            usuario_id=uid,
            metadata={"changed": changed},
        )


@receiver(post_delete, sender=BloqueoAgenda)
def bloqueo_post_delete(sender, instance: BloqueoAgenda, **kwargs):
    uid = getattr(instance, "usuario_id", None)

    _audit(
        descripcion=f"DELETE BloqueoAgenda #{instance.pk}",
        accion="DELETE",
        recurso="BloqueoAgenda",
        recurso_id=instance.pk,
        usuario_id=uid,
        metadata={
            "id": instance.pk,
            "usuario_id": uid,
            "profesional_id": instance.profesional_id,
            "fecha_inicio": str(instance.fecha_inicio),
            "fecha_fin": str(instance.fecha_fin),
            "motivo": instance.motivo,
        },
    )