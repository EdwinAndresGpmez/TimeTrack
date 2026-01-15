from django.contrib import admin
from .models import PQRS, ConvocatoriaHV

@admin.register(PQRS)
class PQRSAdmin(admin.ModelAdmin):
    list_display = ('tipo', 'nombre_remitente', 'asunto', 'estado', 'created_at')
    list_filter = ('estado', 'tipo', 'created_at')
    search_fields = ('nombre_remitente', 'asunto', 'numero_radicado')
    list_editable = ('estado',) # Para cambiar de "Recibido" a "En Trámite" rápido
    readonly_fields = ('created_at',) # Para que nadie altere la fecha de recepción

@admin.register(ConvocatoriaHV)
class ConvocatoriaHVAdmin(admin.ModelAdmin):
    list_display = ('nombre_completo', 'perfil_profesional', 'telefono', 'leido', 'fecha_postulacion')
    list_filter = ('leido', 'perfil_profesional', 'fecha_postulacion')
    search_fields = ('nombre_completo', 'correo')
    list_editable = ('leido',) # Marcar como leído desde la lista