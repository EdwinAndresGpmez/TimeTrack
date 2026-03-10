# Generated manually for notification SaaS channel configuration
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("comunicaciones", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="notificacion",
            name="canal",
            field=models.CharField(default="system", max_length=50),
        ),
        migrations.AddField(
            model_name="notificacion",
            name="destinatario_email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name="notificacion",
            name="destinatario_telefono",
            field=models.CharField(blank=True, max_length=40, null=True),
        ),
        migrations.AddField(
            model_name="notificacion",
            name="error_detalle",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="notificacion",
            name="estado",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pendiente"),
                    ("SENT", "Enviada"),
                    ("FAILED", "Fallida"),
                    ("SKIPPED", "Omitida"),
                ],
                default="PENDING",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="notificacion",
            name="metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="notificacion",
            name="provider_message_id",
            field=models.CharField(blank=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="notificacion",
            name="sender_mode",
            field=models.CharField(
                choices=[
                    ("BYO", "Bring Your Own Sender"),
                    ("SHARED", "Shared Sender Idefnova"),
                ],
                default="BYO",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="notificacion",
            name="tenant_id",
            field=models.BigIntegerField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="notificacion",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="notificacion",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("EMAIL", "Email"),
                    ("WHATSAPP", "WhatsApp"),
                    ("SISTEMA", "Sistema"),
                ],
                default="SISTEMA",
                max_length=50,
            ),
        ),
        migrations.AddIndex(
            model_name="notificacion",
            index=models.Index(fields=["tenant_id", "created_at"], name="notif_tenant_created_idx"),
        ),
        migrations.AddIndex(
            model_name="notificacion",
            index=models.Index(fields=["tenant_id", "tipo", "estado"], name="notif_tenant_tipo_estado_idx"),
        ),
        migrations.CreateModel(
            name="ChannelProviderConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tenant_id", models.BigIntegerField(db_index=True)),
                (
                    "channel",
                    models.CharField(
                        choices=[
                            ("email", "Email"),
                            ("whatsapp_meta", "WhatsApp Meta"),
                            ("whatsapp_qr", "WhatsApp QR"),
                        ],
                        max_length=50,
                    ),
                ),
                (
                    "sender_mode",
                    models.CharField(
                        choices=[
                            ("BYO", "Bring Your Own Sender"),
                            ("SHARED", "Shared Sender Idefnova"),
                        ],
                        default="BYO",
                        max_length=20,
                    ),
                ),
                ("provider", models.CharField(default="custom", max_length=60)),
                ("is_active", models.BooleanField(default=True)),
                ("is_default", models.BooleanField(default=False)),
                ("from_email", models.EmailField(blank=True, max_length=254, null=True)),
                ("from_name", models.CharField(blank=True, max_length=120, null=True)),
                ("config", models.JSONField(blank=True, default=dict)),
                ("notes", models.CharField(blank=True, max_length=255, null=True)),
                ("created_by", models.BigIntegerField(blank=True, null=True)),
                ("updated_by", models.BigIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["tenant_id", "channel", "-is_default", "-updated_at"],
                "indexes": [models.Index(fields=["tenant_id", "channel", "is_active"], name="chan_cfg_tenant_channel_active_idx")],
            },
        ),
        migrations.CreateModel(
            name="NotificationTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tenant_id", models.BigIntegerField(db_index=True)),
                ("code", models.CharField(max_length=80)),
                ("channel", models.CharField(max_length=50)),
                ("is_active", models.BooleanField(default=True)),
                ("subject_template", models.CharField(blank=True, max_length=255, null=True)),
                ("body_template", models.TextField()),
                ("created_by", models.BigIntegerField(blank=True, null=True)),
                ("updated_by", models.BigIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["tenant_id", "code", "channel"],
                "indexes": [models.Index(fields=["tenant_id", "code", "is_active"], name="notif_tpl_tenant_code_active_idx")],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("tenant_id", "code", "channel"),
                        name="uniq_notification_template_tenant_code_channel",
                    )
                ],
            },
        ),
    ]
