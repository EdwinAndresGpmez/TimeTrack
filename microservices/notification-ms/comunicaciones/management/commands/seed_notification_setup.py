from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from comunicaciones.models import ChannelProviderConfig, NotificationTemplate


class Command(BaseCommand):
    help = "Seed base notification configs/templates for a tenant."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-id", type=int, required=True)
        parser.add_argument("--with-demo-byo-email", action="store_true")

    def handle(self, *args, **options):
        tenant_id = options["tenant_id"]
        with_demo_byo = bool(options["with_demo_byo_email"])

        if tenant_id <= 0:
            raise CommandError("tenant-id invalido")

        shared_email, _ = ChannelProviderConfig.objects.update_or_create(
            tenant_id=tenant_id,
            channel=ChannelProviderConfig.Channel.EMAIL,
            sender_mode=ChannelProviderConfig.SenderMode.SHARED,
            provider="idefnova_shared",
            defaults={
                "is_active": True,
                "is_default": True,
                "from_email": getattr(settings, "NOTIF_SHARED_EMAIL_FROM", "") or None,
                "from_name": getattr(settings, "NOTIF_SHARED_EMAIL_FROM_NAME", "Idefnova"),
                "config": {},
                "notes": "Shared Sender Idefnova",
            },
        )

        if with_demo_byo:
            demo_host = getattr(settings, "DEMO_BYO_EMAIL_HOST", "")
            demo_port = getattr(settings, "DEMO_BYO_EMAIL_PORT", "")
            demo_user = getattr(settings, "DEMO_BYO_EMAIL_USER", "")
            demo_pass = getattr(settings, "DEMO_BYO_EMAIL_PASSWORD", "")
            demo_from = getattr(settings, "DEMO_BYO_EMAIL_FROM", "")

            if not all([demo_host, demo_port, demo_user, demo_pass, demo_from]):
                raise CommandError(
                    "Faltan variables DEMO_BYO_EMAIL_* para crear conexion BYO de prueba"
                )

            ChannelProviderConfig.objects.update_or_create(
                tenant_id=tenant_id,
                channel=ChannelProviderConfig.Channel.EMAIL,
                sender_mode=ChannelProviderConfig.SenderMode.BYO,
                provider="smtp",
                defaults={
                    "is_active": True,
                    "is_default": False,
                    "from_email": demo_from,
                    "from_name": "Clinica Demo",
                    "config": {
                        "host": demo_host,
                        "port": int(demo_port),
                        "username": demo_user,
                        "password": demo_pass,
                        "use_tls": True,
                    },
                    "notes": "BYO sender demo",
                },
            )

        ChannelProviderConfig.objects.update_or_create(
            tenant_id=tenant_id,
            channel=ChannelProviderConfig.Channel.WHATSAPP_META,
            sender_mode=ChannelProviderConfig.SenderMode.SHARED,
            provider="meta_whatsapp",
            defaults={
                "is_active": True,
                "is_default": True,
                "config": {},
                "notes": "Pendiente activacion cuenta institucional Meta",
            },
        )

        ChannelProviderConfig.objects.update_or_create(
            tenant_id=tenant_id,
            channel=ChannelProviderConfig.Channel.WHATSAPP_QR,
            sender_mode=ChannelProviderConfig.SenderMode.BYO,
            provider="whatsapp_qr_gateway",
            defaults={
                "is_active": True,
                "is_default": False,
                "config": {
                    "endpoint": getattr(settings, "NOTIF_WHATSAPP_QR_ENDPOINT", ""),
                },
                "notes": "Canal temporal QR (no recomendado para produccion)",
            },
        )

        ChannelProviderConfig.objects.update_or_create(
            tenant_id=tenant_id,
            channel=ChannelProviderConfig.Channel.SMS_LABSMOBILE,
            sender_mode=ChannelProviderConfig.SenderMode.BYO,
            provider="labsmobile",
            defaults={
                "is_active": True,
                "is_default": False,
                "config": {
                    "user": getattr(settings, "LABSMOBILE_USER", ""),
                    "api_key": getattr(settings, "LABSMOBILE_API_KEY", ""),
                    "tpoa": getattr(settings, "LABSMOBILE_TPOA", "Idefnova"),
                },
                "notes": "SMS LabsMobile (BYO)",
            },
        )

        ChannelProviderConfig.objects.update_or_create(
            tenant_id=tenant_id,
            channel=ChannelProviderConfig.Channel.SMS_TWILIO,
            sender_mode=ChannelProviderConfig.SenderMode.BYO,
            provider="twilio",
            defaults={
                "is_active": False,
                "is_default": False,
                "config": {
                    "account_sid": "",
                    "auth_token": "",
                    "from_number": "",
                },
                "notes": "SMS Twilio (BYO)",
            },
        )

        NotificationTemplate.objects.update_or_create(
            tenant_id=tenant_id,
            code="appointment_created",
            channel=ChannelProviderConfig.Channel.EMAIL,
            defaults={
                "is_active": True,
                "subject_template": "Nueva cita solicitada",
                "body_template": (
                    "<p>Hola {{ paciente_nombre }},</p>"
                    "<p>Tu cita con {{ profesional_nombre }} fue registrada para {{ fecha_cita }} {{ hora_cita }}.</p>"
                ),
            },
        )
        NotificationTemplate.objects.update_or_create(
            tenant_id=tenant_id,
            code="appointment_confirmed",
            channel=ChannelProviderConfig.Channel.EMAIL,
            defaults={
                "is_active": True,
                "subject_template": "Cita confirmada",
                "body_template": (
                    "<p>Hola {{ paciente_nombre }},</p>"
                    "<p>Tu cita fue confirmada para {{ fecha_cita }} {{ hora_cita }}.</p>"
                ),
            },
        )
        NotificationTemplate.objects.update_or_create(
            tenant_id=tenant_id,
            code="appointment_confirmed",
            channel=ChannelProviderConfig.Channel.WHATSAPP_QR,
            defaults={
                "is_active": True,
                "subject_template": "",
                "body_template": (
                    "Hola {{ paciente_nombre }}, tu cita fue confirmada para {{ fecha_cita }} {{ hora_cita }}."
                ),
            },
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"OK seed tenant={tenant_id}. shared_email_id={shared_email.id}"
            )
        )
