from django.db import models


class Notificacion(models.Model):
    class Tipo(models.TextChoices):
        EMAIL = "EMAIL", "Email"
        WHATSAPP = "WHATSAPP", "WhatsApp"
        SMS = "SMS", "SMS"
        SISTEMA = "SISTEMA", "Sistema"

    class Estado(models.TextChoices):
        PENDING = "PENDING", "Pendiente"
        SENT = "SENT", "Enviada"
        FAILED = "FAILED", "Fallida"
        SKIPPED = "SKIPPED", "Omitida"

    class SenderMode(models.TextChoices):
        BYO = "BYO", "Bring Your Own Sender"
        SHARED = "SHARED", "Shared Sender Idefnova"

    tenant_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    usuario_id = models.BigIntegerField(db_index=True)
    cita_id = models.BigIntegerField(null=True, blank=True)

    asunto = models.CharField(max_length=255)
    mensaje = models.TextField()

    leida = models.BooleanField(default=False)
    tipo = models.CharField(max_length=50, choices=Tipo.choices, default=Tipo.SISTEMA)
    estado = models.CharField(max_length=30, choices=Estado.choices, default=Estado.PENDING)
    canal = models.CharField(max_length=50, default="system")
    sender_mode = models.CharField(max_length=20, choices=SenderMode.choices, default=SenderMode.BYO)
    destinatario_email = models.EmailField(blank=True, null=True)
    destinatario_telefono = models.CharField(max_length=40, blank=True, null=True)
    provider_message_id = models.CharField(max_length=120, blank=True, null=True)
    error_detalle = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant_id", "created_at"]),
            models.Index(fields=["usuario_id", "leida"]),
            models.Index(fields=["tenant_id", "tipo", "estado"]),
        ]

    def __str__(self):
        return f"{self.asunto} - User {self.usuario_id}"


class ChannelProviderConfig(models.Model):
    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        WHATSAPP_META = "whatsapp_meta", "WhatsApp Meta"
        WHATSAPP_QR = "whatsapp_qr", "WhatsApp QR"
        SMS_LABSMOBILE = "sms_labsmobile", "SMS LabsMobile"
        SMS_TWILIO = "sms_twilio", "SMS Twilio"

    class SenderMode(models.TextChoices):
        BYO = "BYO", "Bring Your Own Sender"
        SHARED = "SHARED", "Shared Sender Idefnova"

    tenant_id = models.BigIntegerField(db_index=True)
    channel = models.CharField(max_length=50, choices=Channel.choices)
    sender_mode = models.CharField(max_length=20, choices=SenderMode.choices, default=SenderMode.BYO)
    provider = models.CharField(max_length=60, default="custom")
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    from_email = models.EmailField(blank=True, null=True)
    from_name = models.CharField(max_length=120, blank=True, null=True)
    config = models.JSONField(default=dict, blank=True)
    notes = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.BigIntegerField(null=True, blank=True)
    updated_by = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tenant_id", "channel", "-is_default", "-updated_at"]
        indexes = [
            models.Index(fields=["tenant_id", "channel", "is_active"]),
        ]

    def __str__(self):
        return f"tenant={self.tenant_id} channel={self.channel} mode={self.sender_mode}"


class NotificationTemplate(models.Model):
    tenant_id = models.BigIntegerField(db_index=True)
    code = models.CharField(max_length=80)
    channel = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    subject_template = models.CharField(max_length=255, blank=True, null=True)
    body_template = models.TextField()
    created_by = models.BigIntegerField(null=True, blank=True)
    updated_by = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tenant_id", "code", "channel"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant_id", "code", "channel"],
                name="uniq_notification_template_tenant_code_channel",
            )
        ]
        indexes = [
            models.Index(fields=["tenant_id", "code", "is_active"]),
        ]

    def __str__(self):
        return f"tenant={self.tenant_id} {self.code} [{self.channel}]"
