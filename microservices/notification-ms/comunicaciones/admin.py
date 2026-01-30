from django.contrib import admin

from .models import Notificacion


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ("asunto", "usuario_id", "tipo", "leida", "created_at")
    list_filter = ("leida", "tipo", "created_at")
    search_fields = ("asunto", "mensaje")
