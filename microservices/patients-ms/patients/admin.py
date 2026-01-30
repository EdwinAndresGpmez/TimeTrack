from django.contrib import admin
from .models import Paciente, TipoPaciente, SolicitudValidacion


@admin.register(TipoPaciente)
class TipoPacienteAdmin(admin.ModelAdmin):
    list_display = ("nombre", "activo")
    search_fields = ("nombre",)
    ordering = ("nombre",)


@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = (
        "nombre_completo",
        "numero_documento",
        "tipo_documento",
        "user_id",
        "tipo_usuario",
        "telefono",
        "ultima_fecha_desbloqueo",  # <--- NUEVO: Para verificar el desbloqueo
        "activo",
    )

    # Filtros laterales
    list_filter = ("tipo_usuario", "tipo_documento", "genero", "activo")

    # Barra de búsqueda
    search_fields = ("nombre", "apellido", "numero_documento")

    # Campos de solo lectura (fechas de sistema)
    readonly_fields = ("created_at", "updated_at")

    # Paginación
    list_per_page = 25

    # Método helper para mostrar nombre completo en la lista
    def nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}"

    nombre_completo.short_description = "Paciente"


@admin.register(SolicitudValidacion)
class SolicitudValidacionAdmin(admin.ModelAdmin):
    list_display = (
        "nombre",
        "user_doc",
        "email",
        "fecha_solicitud",
        "procesado",
        "user_id",
    )

    list_filter = ("procesado", "fecha_solicitud")
    search_fields = ("nombre", "user_doc", "email")
    ordering = ("-fecha_solicitud",)
