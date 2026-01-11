from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CrearCuenta, MenuItem, PermisoVista, Auditoria

class CustomUserAdmin(UserAdmin):
    model = CrearCuenta
    
    # 1. Columnas actualizadas
    list_display = (
        'documento', # <-- Cambio
        'nombre', 
        'correo', 
        'tipo_documento', 
        'paciente_id', 
        'profesional_id', 
        'is_active', 
        'is_staff'
    )
    
    # 2. Búsqueda actualizada
    search_fields = ('documento', 'nombre', 'correo', 'username') # <-- Cambio
    
    # 3. Filtros (Igual)
    list_filter = ('tipo_documento', 'is_staff', 'is_active', 'usuario_estado')
    
    # 4. Ordenamiento
    ordering = ('documento',) # <-- Cambio

    # 5. Formularios
    fieldsets = (
        ('Credenciales', {'fields': ('username', 'documento', 'password')}), # <-- Cambio
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

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('documento', 'username', 'nombre', 'correo', 'password', 'confirm_password'), # <-- Cambio
        }),
    )

# El resto de registros (MenuItem, etc.) se mantienen igual
admin.site.register(CrearCuenta, CustomUserAdmin)
admin.site.register(MenuItem)
# ... etc