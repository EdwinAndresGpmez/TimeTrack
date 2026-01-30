from django.contrib import admin

from .models import BloqueoAgenda, Disponibilidad


@admin.register(Disponibilidad)
class DisponibilidadAdmin(admin.ModelAdmin):
    list_display = (
        "profesional_id",
        "dia_semana_nombre",
        "hora_inicio",
        "hora_fin",
        "lugar_id",
        "activo",
    )
    list_filter = ("dia_semana", "activo")
    ordering = ("profesional_id", "dia_semana", "hora_inicio")

    def dia_semana_nombre(self, obj):
        return obj.get_dia_semana_display()

    dia_semana_nombre.short_description = "Día"


@admin.register(BloqueoAgenda)
class BloqueoAgendaAdmin(admin.ModelAdmin):
    list_display = ("profesional_id", "fecha_inicio", "fecha_fin", "motivo")
    search_fields = ("motivo",)
    ordering = ("-fecha_inicio",)
