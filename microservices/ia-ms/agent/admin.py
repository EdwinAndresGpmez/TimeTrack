from django.contrib import admin
from .models import AIConfiguration, ChatSession, ChatMessage

@admin.register(AIConfiguration)
class AIConfigAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'proveedor', 'model_name', 'activo')
    list_filter = ('proveedor', 'activo')
    # Ocultamos la API Key en la lista por seguridad
    sensitive_fields = ('api_key',)

@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario_id', 'created_at', 'activo')
    list_filter = ('created_at',)

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('session', 'role', 'timestamp')
    list_filter = ('role', 'timestamp')