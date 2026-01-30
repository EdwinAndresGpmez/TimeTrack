from django.db import models


class TipoPaciente(models.Model):
    """Categorización (Ej: EPS, Particular, Prepagada)"""

    nombre = models.CharField(max_length=100, unique=True)  # legacy: nombre_tipo
    activo = models.BooleanField(default=True)  # legacy: estado_tipo

    def __str__(self):
        return self.nombre


class Paciente(models.Model):
    TIPO_DOC_CHOICES = [
        ("CC", "Cédula de ciudadanía"),
        ("NIT", "NIT"),
        ("RC", "Registro Civil"),
        ("TI", "Tarjeta de identidad"),
        ("CE", "Cédula de extranjería"),
        ("PA", "Pasaporte"),
        ("AS", "Adulto sin identificación"),
        ("MS", "Menor sin identificación"),
        ("PE", "Permiso especial"),
        ("CN", "Nacido Vivo"),
        ("PT", "Permiso de Protección Temporal"),
    ]

    nombre = models.CharField(max_length=255)
    apellido = models.CharField(
        max_length=255, blank=True
    )  # Legacy a veces tiene nombre completo en un campo
    tipo_documento = models.CharField(max_length=10, choices=TIPO_DOC_CHOICES)
    numero_documento = models.CharField(max_length=50, unique=True, db_index=True)

    fecha_nacimiento = models.DateField()
    genero = models.CharField(
        max_length=20, choices=[("M", "Masculino"), ("F", "Femenino"), ("O", "Otro")]
    )

    direccion = models.CharField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=50, blank=True, null=True)
    email_contacto = models.EmailField(blank=True, null=True)

    # Relación interna
    user_id = models.BigIntegerField(unique=True, null=True, blank=True, db_index=True)
    tipo_usuario = models.ForeignKey(TipoPaciente, on_delete=models.SET_NULL, null=True)

    activo = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ultima_fecha_desbloqueo = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido}"


class SolicitudValidacion(models.Model):
    user_id = models.BigIntegerField(unique=True)  # ID del Auth User
    nombre = models.CharField(max_length=255)
    email = models.EmailField()
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    procesado = models.BooleanField(default=False)
    user_doc = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"Solicitud: {self.nombre} ({'Procesada' if self.procesado else 'Pendiente'})"
