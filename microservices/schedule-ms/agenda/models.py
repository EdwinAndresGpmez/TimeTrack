from django.db import models
from django.core.exceptions import ValidationError
import datetime

class Disponibilidad(models.Model):
    """
    Horario Base Recurrente.
    Ej: El médico X atiende los Lunes de 8:00 a 12:00 en la Sede Norte.
    """
    DIAS = [
        (0, 'Lunes'), (1, 'Martes'), (2, 'Miércoles'), 
        (3, 'Jueves'), (4, 'Viernes'), (5, 'Sábado'), (6, 'Domingo')
    ]

    # Referencias a Professionals-MS (Puerto 8002)
    profesional_id = models.BigIntegerField(db_index=True) 
    lugar_id = models.BigIntegerField()
    
    # Si es null, aplica para cualquier servicio. Si tiene ID, es exclusivo para ese servicio.
    servicio_id = models.BigIntegerField(null=True, blank=True)
    
    dia_semana = models.IntegerField(choices=DIAS)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Disponibilidad"
        verbose_name_plural = "Disponibilidades"
        # Constraint: Un médico no puede tener dos horarios solapados el mismo día
        ordering = ['dia_semana', 'hora_inicio']

    def clean(self):
        if self.hora_inicio and self.hora_fin and self.hora_inicio >= self.hora_fin:
            raise ValidationError("La hora de inicio debe ser anterior a la hora fin.")

    def __str__(self):
        return f"Prof {self.profesional_id} - {self.get_dia_semana_display()} ({self.hora_inicio}-{self.hora_fin})"

class BloqueoAgenda(models.Model):
    """
    Excepciones al horario (Vacaciones, Permisos, Festivos).
    El sistema debe consultar esto antes de permitir agendar.
    """
    profesional_id = models.BigIntegerField(db_index=True)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    motivo = models.CharField(max_length=255) # Ej: "Vacaciones", "Cita Médica Personal"

    class Meta:
        verbose_name = "Bloqueo de Agenda"
        verbose_name_plural = "Bloqueos de Agenda"

    def __str__(self):
        return f"Bloqueo Prof {self.profesional_id}: {self.motivo}"