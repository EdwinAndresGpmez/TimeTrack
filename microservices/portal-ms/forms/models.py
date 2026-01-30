from django.db import models


class ConvocatoriaHV(models.Model):
    """
    Sección Trabaje con Nosotros
    """

    nombre_completo = models.CharField(max_length=255)
    correo = models.EmailField()
    telefono = models.CharField(max_length=50)
    perfil_profesional = models.CharField(
        max_length=255, help_text="Ej: Enfermera, Médico General, Contador"
    )

    # El archivo de la Hoja de Vida (PDF preferiblemente)
    archivo_hv = models.FileField(upload_to="hojas_de_vida/")

    mensaje_adicional = models.TextField(blank=True, null=True)
    fecha_postulacion = models.DateTimeField(auto_now_add=True)
    leido = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.nombre_completo} - {self.perfil_profesional}"


class PQRS(models.Model):
    """
    Peticiones, Quejas, Reclamos y Sugerencias
    """

    TIPO_CHOICES = [
        ("PETICION", "Petición"),
        ("QUEJA", "Queja"),
        ("RECLAMO", "Reclamo"),
        ("SUGERENCIA", "Sugerencia"),
        ("FELICITACION", "Felicitación"),
    ]

    ESTADO_CHOICES = [
        ("RECIBIDO", "Recibido"),
        ("EN_TRAMITE", "En Trámite"),
        ("CERRADO", "Cerrado/Resuelto"),
    ]

    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    nombre_remitente = models.CharField(max_length=255)
    correo = models.EmailField()
    telefono = models.CharField(max_length=50, blank=True)

    asunto = models.CharField(max_length=200)
    mensaje = models.TextField()

    # Archivo opcional (evidencia)
    adjunto = models.FileField(upload_to="pqrs_adjuntos/", blank=True, null=True)

    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="RECIBIDO")
    respuesta_interna = models.TextField(blank=True, help_text="Uso administrativo")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.tipo} #{self.id} - {self.nombre_remitente}"
