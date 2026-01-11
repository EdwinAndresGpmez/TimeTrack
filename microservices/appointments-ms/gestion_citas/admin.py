from django.contrib import admin
from .models import Cita, NotaMedica, HistoricoCita

class NotaMedicaInline(admin.StackedInline):
    model = NotaMedica
    extra = 0

@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'fecha', 'hora_inicio', 
        'estado', 'paciente_id', 'profesional_id', 'activo'
    )
    list_filter = ('estado', 'fecha', 'activo')
    search_fields = ('id',) # Búsqueda por ID de cita
    inlines = [NotaMedicaInline] # Permite ver/editar la nota médica dentro de la cita

@admin.register(HistoricoCita)
class HistoricoCitaAdmin(admin.ModelAdmin):
    list_display = (
        'cita_original_id', 'fecha_cita', 
        'nombre_paciente', 'nombre_profesional', 
        'estado', 'fecha_registro'
    )
    list_filter = ('estado', 'fecha_cita')
    readonly_fields = [field.name for field in HistoricoCita._meta.fields] # Solo lectura para seguridad