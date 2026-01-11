from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CrearCuenta, MenuItem, PermisoVista, Auditoria

class CustomUserAdmin(UserAdmin):
    model = CrearCuenta
    
    # 1. Columnas que se verán en la tabla principal
    list_display = (
        'cedula', 
        'nombre', 
        'correo', 
        'tipo_documento', 
        'paciente_id', 
        'profesional_id', 
        'is_active', 
        'is_staff'
    )
    
    # 2. Campos por los que podrás buscar
    search_fields = ('cedula', 'nombre', 'correo', 'username')
    
    # 3. Filtros laterales
    list_filter = ('tipo_documento', 'is_staff', 'is_active', 'usuario_estado')
    
    # 4. Ordenamiento por defecto
    ordering = ('cedula',)

    # 5. Organización del formulario de edición
    fieldsets = (
        ('Credenciales', {'fields': ('username', 'cedula', 'password')}),
        ('Información Personal', {
            'fields': (
                'nombre', 
                'correo', 
                'tipo_documento', 
                'numero',
                'acepta_tratamiento_datos'
            )
        }),
        ('Enlaces a Microservicios', {
            'fields': ('paciente_id', 'profesional_id'),
            'description': 'IDs de referencia a las tablas de Patients-MS y Professionals-MS'
        }),
        ('Permisos y Estado', {
            'fields': (
                'is_active', 
                'is_staff', 
                'is_superuser', 
                'usuario_estado',
                'groups', 
                'user_permissions'
            )
        }),
    )

    # Configuración para el formulario de "Agregar Usuario" desde el admin
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('cedula', 'username', 'nombre', 'correo', 'password', 'confirm_password'),
        }),
    )

# Configuración básica para los otros modelos
@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('label', 'url', 'order')
    list_editable = ('order',)
    ordering = ('order',)

@admin.register(PermisoVista)
class PermisoVistaAdmin(admin.ModelAdmin):
    list_display = ('nombre_vista',)

@admin.register(Auditoria)
class AuditoriaAdmin(admin.ModelAdmin):
    list_display = ('fecha', 'usuario_id', 'modulo', 'descripcion')
    list_filter = ('modulo', 'fecha')
    readonly_fields = ('fecha',) # Para que nadie pueda alterar la fecha de auditoría

# Registrar el modelo de usuario con la configuración personalizada
admin.site.register(CrearCuenta, CustomUserAdmin)