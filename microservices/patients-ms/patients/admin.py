from django.contrib import admin
from .models import Paciente, TipoPaciente

@admin.register(TipoPaciente)
class TipoPacienteAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo')
    search_fields = ('nombre',)
    ordering = ('nombre',)

@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = (
        'nombre_completo', 
        'numero_documento', 
        'tipo_documento', 
        'tipo_usuario', 
        'telefono', 
        'activo'
    )
    
    # Filtros laterales potentes
    list_filter = ('tipo_usuario', 'tipo_documento', 'genero', 'activo')
    
    # Barra de búsqueda
    search_fields = ('nombre', 'apellido', 'numero_documento')
    
    # Paginación (útil cuando tengas miles de pacientes)
    list_per_page = 25

    # Método helper para mostrar nombre completo en la lista
    def nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}"
    nombre_completo.short_description = 'Paciente'