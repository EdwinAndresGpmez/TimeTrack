from rest_framework import serializers
from .models import Disponibilidad, BloqueoAgenda

class DisponibilidadSerializer(serializers.ModelSerializer):
    # Campo legible para el día de la semana (Lunes, Martes...)
    dia_nombre = serializers.CharField(source='get_dia_semana_display', read_only=True)

    class Meta:
        model = Disponibilidad
        fields = [
            'id', 'profesional_id', 'lugar_id', 'servicio_id',
            'dia_semana', 'dia_nombre', 'hora_inicio', 'hora_fin', 
            'activo'
        ]

    def validate(self, data):
        """Validación extra para asegurar coherencia"""
        if data['hora_inicio'] >= data['hora_fin']:
            raise serializers.ValidationError("La hora de inicio debe ser anterior a la hora de fin.")
        return data

class BloqueoAgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloqueoAgenda
        fields = '__all__'

    def validate(self, data):
        if data['fecha_inicio'] >= data['fecha_fin']:
            raise serializers.ValidationError("La fecha de inicio debe ser anterior a la fecha de fin.")
        return data