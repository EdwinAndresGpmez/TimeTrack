from django.contrib import admin

from .models import Especialidad, Lugar, Profesional, Servicio


@admin.register(Especialidad)
class EspecialidadAdmin(admin.ModelAdmin):
    list_display = ("nombre", "descripcion")
    search_fields = ("nombre",)


@admin.register(Lugar)
class LugarAdmin(admin.ModelAdmin):
    list_display = ("nombre", "ciudad", "direccion", "activo")
    list_filter = ("ciudad", "activo")
    search_fields = ("nombre", "direccion")


@admin.register(Profesional)
class ProfesionalAdmin(admin.ModelAdmin):
    list_display = (
        "nombre",
        "numero_documento",
        "registro_medico",
        "email_profesional",
        "telefono_profesional",
        "activo",
    )
    # Filtros laterales
    list_filter = ("activo", "especialidades", "lugares_atencion__ciudad")

    # Búsqueda por nombre o documento
    search_fields = (
        "nombre",
        "numero_documento",
        "registro_medico",
        "email_profesional",
    )

    # Widget especial para seleccionar muchos items fácilmente
    filter_horizontal = ("especialidades", "lugares_atencion")


@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ("nombre", "duracion_minutos", "precio_base", "activo")
    list_filter = ("activo", "duracion_minutos")
    search_fields = ("nombre",)

    # Widget especial para asignar qué médicos hacen este servicio
    filter_horizontal = ("profesionales",)

    # Ordenar por nombre
    ordering = ("nombre",)
