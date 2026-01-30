from django.db import models
from rest_framework.exceptions import ValidationError


class Especialidad(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Especialidad"
        verbose_name_plural = "Especialidades"

    def __str__(self):
        return self.nombre

    # --- PROTECCIÓN DE BORRADO ---
    def delete(self, *args, **kwargs):
        if self.profesional_set.exists():
            raise ValidationError(
                {
                    "detail": f"No se puede borrar '{self.nombre}' porque hay profesionales con esta especialidad. Desactívelo en su lugar."
                }
            )
        super().delete(*args, **kwargs)


class Lugar(models.Model):
    nombre = models.CharField(max_length=255)
    direccion = models.CharField(max_length=255)
    ciudad = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Lugar"
        verbose_name_plural = "Lugares"

    def __str__(self):
        return self.nombre

    def delete(self, *args, **kwargs):
        if self.profesionales.exists():
            raise ValidationError(
                {
                    "detail": f"No se puede borrar la sede '{self.nombre}' porque tiene profesionales asignados. Desactívela."
                }
            )
        super().delete(*args, **kwargs)


class Profesional(models.Model):
    nombre = models.CharField(max_length=255)
    numero_documento = models.CharField(max_length=50, unique=True)
    registro_medico = models.CharField(max_length=100, unique=True)
    email_profesional = models.EmailField(unique=True)
    telefono_profesional = models.CharField(max_length=50)

    especialidades = models.ManyToManyField(Especialidad)
    lugares_atencion = models.ManyToManyField(Lugar, related_name="profesionales")

    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Profesional"
        verbose_name_plural = "Profesionales"

    def __str__(self):
        return self.nombre


class Servicio(models.Model):
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)
    duracion_minutos = models.IntegerField()
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)

    profesionales = models.ManyToManyField(Profesional, related_name="servicios_habilitados", blank=True)

    tipos_paciente_ids = models.JSONField(default=list, blank=True)

    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"

    def __str__(self):
        return self.nombre

    def delete(self, *args, **kwargs):
        if self.profesionales.exists():
            raise ValidationError(
                {"detail": f"No se puede borrar '{self.nombre}' porque tiene profesionales. Desactívelo."}
            )
        super().delete(*args, **kwargs)
