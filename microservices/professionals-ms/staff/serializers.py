from rest_framework import serializers
from .models import Especialidad, Lugar, Profesional, Servicio

class EspecialidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = '__all__'

class LugarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lugar
        fields = '__all__'

class ProfesionalSerializer(serializers.ModelSerializer):
    # Campos de solo lectura para mostrar nombres en el frontend
    especialidades_nombres = serializers.StringRelatedField(many=True, source='especialidades', read_only=True)
    lugares_nombres = serializers.StringRelatedField(many=True, source='lugares_atencion', read_only=True)

    class Meta:
        model = Profesional
        fields = [
            'id', 'nombre', 'numero_documento', 'registro_medico',
            'email_profesional', 'telefono_profesional', 'activo',
            'especialidades', 'especialidades_nombres', # IDs para escribir, Nombres para leer
            'lugares_atencion', 'lugares_nombres'
        ]

class ServicioSerializer(serializers.ModelSerializer):
    # Mostramos cuántos médicos hacen este servicio
    total_profesionales = serializers.SerializerMethodField()

    class Meta:
        model = Servicio
        fields = [
            'id', 'nombre', 'descripcion', 'duracion_minutos', 
            'precio_base', 'activo', 'profesionales', 'total_profesionales'
        ]

    def get_total_profesionales(self, obj):
        return obj.profesionales.count()