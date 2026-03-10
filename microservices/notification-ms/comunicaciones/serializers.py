from rest_framework import serializers

from .models import ChannelProviderConfig, Notificacion, NotificationTemplate


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = "__all__"
        read_only_fields = [
            "id",
            "tenant_id",
            "estado",
            "provider_message_id",
            "error_detalle",
            "created_at",
            "updated_at",
        ]


class ChannelProviderConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChannelProviderConfig
        fields = "__all__"
        read_only_fields = ["id", "tenant_id", "created_by", "updated_by", "created_at", "updated_at"]


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = "__all__"
        read_only_fields = ["id", "tenant_id", "created_by", "updated_by", "created_at", "updated_at"]


class SendNotificationSerializer(serializers.Serializer):
    template_code = serializers.CharField(required=False, allow_blank=True)
    usuario_id = serializers.IntegerField()
    cita_id = serializers.IntegerField(required=False, allow_null=True)
    channel = serializers.ChoiceField(
        choices=["email", "whatsapp_meta", "whatsapp_qr", "sms_labsmobile", "sms_twilio", "system"]
    )
    sender_mode = serializers.ChoiceField(choices=["BYO", "SHARED"], required=False, default="BYO")
    to_email = serializers.EmailField(required=False, allow_blank=True)
    to_phone = serializers.CharField(required=False, allow_blank=True)
    subject = serializers.CharField(required=False, allow_blank=True)
    message = serializers.CharField(required=False, allow_blank=True)
    context = serializers.DictField(required=False, default=dict)
