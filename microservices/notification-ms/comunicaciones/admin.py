from django.contrib import admin

from .models import ChannelProviderConfig, Notificacion, NotificationTemplate


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("asunto", "tenant_id", "usuario_id", "tipo", "canal", "estado", "leida", "created_at")
    list_filter = ("tenant_id", "leida", "tipo", "canal", "estado", "created_at")
    search_fields = ("asunto", "mensaje")


@admin.register(ChannelProviderConfig)
class ChannelProviderConfigAdmin(admin.ModelAdmin):
    list_display = ("tenant_id", "channel", "sender_mode", "provider", "is_active", "is_default", "updated_at")
    list_filter = ("channel", "sender_mode", "is_active", "is_default")
    search_fields = ("tenant_id", "provider", "from_email", "notes")


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ("tenant_id", "code", "channel", "is_active", "updated_at")
    list_filter = ("channel", "is_active")
    search_fields = ("tenant_id", "code", "subject_template", "body_template")
