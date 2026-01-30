from django.db import models
from django.core.exceptions import ValidationError


class Disponibilidad(models.Model):
    """
    Horario Base Recurrente con Vigencia.
    """

    DIAS = [
        (0, "Lunes"),
        (1, "Martes"),
        (2, "Miércoles"),
        (3, "Jueves"),
        (4, "Viernes"),
        (5, "Sábado"),
        (6, "Domingo"),
    ]

    profesional_id = models.BigIntegerField(db_index=True)
    lugar_id = models.BigIntegerField()
    servicio_id = models.BigIntegerField(null=True, blank=True)

    dia_semana = models.IntegerField(choices=DIAS)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    # --- FECHA ESPECÍFICA (Prioridad Alta) ---
    # Si tiene valor, este registro solo aplica para ese día exacto.
    fecha = models.DateField(null=True, blank=True, db_index=True)

    # --- VIGENCIA RECURRENTE (Nuevo) ---
    # Si fecha es NULL, esto define hasta cuándo se repite.
    # NULL = Infinito.
    fecha_fin_vigencia = models.DateField(
        null=True, blank=True, verbose_name="Vigente hasta"
    )

    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Disponibilidad"
        verbose_name_plural = "Disponibilidades"
        ordering = ["dia_semana", "hora_inicio"]

    def clean(self):
        if self.hora_inicio and self.hora_fin and self.hora_inicio >= self.hora_fin:
            raise ValidationError("La hora de inicio debe ser anterior a la hora fin.")

    def __str__(self):
        return f"Prof {self.profesional_id} - {self.get_dia_semana_display()} ({self.hora_inicio}-{self.hora_fin})"


class BloqueoAgenda(models.Model):
    profesional_id = models.BigIntegerField(db_index=True)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    motivo = models.CharField(max_length=255)

    class Meta:
        verbose_name = "Bloqueo de Agenda"
        verbose_name_plural = "Bloqueos de Agenda"

    def __str__(self):
        return f"Bloqueo Prof {self.profesional_id}: {self.motivo}"
