from rest_framework import serializers
from .models import Disponibilidad, BloqueoAgenda
from django.db.models import Q

class DisponibilidadSerializer(serializers.ModelSerializer):
    dia_nombre = serializers.CharField(source='get_dia_semana_display', read_only=True)

    class Meta:
        model = Disponibilidad
        fields = [
            'id', 'profesional_id', 'lugar_id', 'servicio_id',
            'dia_semana', 'dia_nombre', 'hora_inicio', 'hora_fin', 
            'activo'
        ]

    def validate(self, data):
        # 1. Validación básica de horas
        if data['hora_inicio'] >= data['hora_fin']:
            raise serializers.ValidationError("La hora de inicio debe ser anterior a la hora de fin.")

        # 2. VALIDACIÓN DE SOLAPAMIENTO (OVERLAP)
        # Buscamos si ya existe otro horario para este médico el mismo día
        # que choque con las horas que estamos intentando guardar.
        overlapping = Disponibilidad.objects.filter(
            profesional_id=data['profesional_id'],
            dia_semana=data['dia_semana'],
            activo=True # Solo nos importan los horarios activos
        ).filter(
            Q(hora_inicio__lt=data['hora_fin']) & 
            Q(hora_fin__gt=data['hora_inicio'])
        )

        # Si estamos editando (instance existe), nos excluimos a nosotros mismos de la búsqueda
        if self.instance:
            overlapping = overlapping.exclude(pk=self.instance.pk)

        if overlapping.exists():
            raise serializers.ValidationError(
                "El profesional ya tiene un horario asignado que se cruza con este rango de horas."
            )

        return data

class BloqueoAgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloqueoAgenda
        fields = '__all__'

    def validate(self, data):
        if data['fecha_inicio'] >= data['fecha_fin']:
            raise serializers.ValidationError("La fecha de inicio debe ser anterior a la fecha de fin.")
        return data