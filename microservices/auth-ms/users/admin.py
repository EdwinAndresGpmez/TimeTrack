from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CrearCuenta, MenuItem, PermisoVista, Auditoria


# --- ADMINISTRACIÓN DE USUARIOS ---
class CustomUserAdmin(UserAdmin):
    model = CrearCuenta

    list_display = (
        "documento",
        "nombre",
        "correo",
        "tipo_documento",
        "is_active",
        "is_staff",
        "paciente_id",
        "profesional_id",
    )

    search_fields = ("documento", "nombre", "correo", "username")
    list_filter = (
        "tipo_documento",
        "is_staff",
        "is_active",
        "usuario_estado",
        "groups",
    )
    ordering = ("documento",)
    filter_horizontal = ("groups", "user_permissions")

    fieldsets = (
        ("Credenciales", {"fields": ("username", "documento", "password")}),
        (
            "Información Personal",
            {
                "fields": (
                    "nombre",
                    "correo",
                    "tipo_documento",
                    "numero",
                    "acepta_tratamiento_datos",
                )
            },
        ),
        (
            "Enlaces a Microservicios",
            {
                "fields": ("paciente_id", "profesional_id"),
                "description": "IDs de referencia (Foreign Keys lógicas) a otros microservicios.",
            },
        ),
        (
            "Permisos y Estado",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "usuario_estado",
                    "groups",
                    "user_permissions",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "documento",
                    "username",
                    "nombre",
                    "correo",
                    "password",
                    "confirm_password",
                ),
            },
        ),
    )


# --- ADMINISTRACIÓN DE MENÚ ---
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ("label", "url", "icon", "order", "get_roles")
    list_editable = ("order", "icon")
    filter_horizontal = ("roles",)
    list_filter = ("roles",)
    ordering = ("order",)
    search_fields = ("label", "url")

    def get_roles(self, obj):
        return ", ".join([role.name for role in obj.roles.all()])

    get_roles.short_description = "Roles Permitidos"


# --- ADMINISTRACIÓN DE VISTAS PROTEGIDAS ---
class PermisoVistaAdmin(admin.ModelAdmin):
    # Asegúrate de usar los nombres de campos EXACTOS de tu models.py
    # Si en models.py tienes 'roles_permitidos', usa ese aquí.
    # Si tienes 'roles', usa 'roles'.
    # Basado en tu último código de models.py, es 'roles' (Related Name: vistas_permitidas)

    list_display = ("codename", "descripcion", "get_roles")
    search_fields = ("codename", "descripcion")

    # CORRECCIÓN: Usamos 'roles' porque así lo definimos en el modelo mejorado
    filter_horizontal = ("roles",)
    list_filter = ("roles",)

    def get_roles(self, obj):
        return ", ".join([role.name for role in obj.roles.all()])

    get_roles.short_description = "Roles Autorizados"


# --- AUDITORÍA (SOLO LECTURA) ---
class AuditoriaAdmin(admin.ModelAdmin):
    list_display = ("fecha", "usuario_id", "modulo", "descripcion_corta")
    list_filter = ("modulo", "fecha")
    search_fields = ("descripcion", "usuario_id")
    readonly_fields = ("fecha", "usuario_id", "modulo", "descripcion")

    def descripcion_corta(self, obj):
        return (
            obj.descripcion[:50] + "..."
            if len(obj.descripcion) > 50
            else obj.descripcion
        )

    descripcion_corta.short_description = "Descripción"

    def has_add_permission(self, request):
        return False


# --- REGISTRO DE MODELOS (UNA SOLA VEZ CADA UNO) ---
admin.site.register(CrearCuenta, CustomUserAdmin)
admin.site.register(MenuItem, MenuItemAdmin)
admin.site.register(PermisoVista, PermisoVistaAdmin)
admin.site.register(Auditoria, AuditoriaAdmin)
