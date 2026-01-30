from django.contrib import admin
from .models import Cita, NotaMedica, HistoricoCita, ConfiguracionGlobal


class NotaMedicaInline(admin.StackedInline):
    model = NotaMedica
    extra = 0


@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "fecha",
        "hora_inicio",
        "estado",
        "paciente_id",
        "profesional_id",
        "activo",
    )
    list_filter = ("estado", "fecha", "activo")
    search_fields = ("id", "paciente_id")  # Búsqueda por ID de cita o paciente
    inlines = [NotaMedicaInline]


@admin.register(HistoricoCita)
class HistoricoCitaAdmin(admin.ModelAdmin):
    list_display = (
        "cita_original_id",
        "fecha_cita",
        "nombre_paciente",
        "nombre_profesional",
        "estado",
        "fecha_registro",
    )
    list_filter = ("estado", "fecha_cita")
    readonly_fields = [field.name for field in HistoricoCita._meta.fields]


# --- NUEVO: Configuración Global en Admin ---
@admin.register(ConfiguracionGlobal)
class ConfiguracionGlobalAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "limite_inasistencias",
        "mensaje_bloqueo_inasistencia",
        "max_citas_dia_paciente",
        "horas_antelacion_cancelar",
        "dias_para_actualizar_datos",
        "permitir_mismo_servicio_dia",
        "mensaje_notificacion_cancelacion",
    )

    # Limitamos permisos para que no creen configuraciones extra (es un Singleton)
    def has_add_permission(self, request):
        return False if self.model.objects.exists() else True
