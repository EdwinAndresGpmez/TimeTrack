from rest_framework import serializers
from .models import Disponibilidad, BloqueoAgenda
from django.db.models import Q
from django.utils import timezone 
import datetime

class DisponibilidadSerializer(serializers.ModelSerializer):
    dia_nombre = serializers.CharField(source='get_dia_semana_display', read_only=True)

    class Meta:
        model = Disponibilidad
        fields = [
            'id', 'profesional_id', 'lugar_id', 'servicio_id',
            'dia_semana', 'dia_nombre', 'hora_inicio', 'hora_fin', 
            'fecha', 'fecha_fin_vigencia', 
            'activo'
        ]

    def validate(self, data):
        # 1. Validación de coherencia de horas (Inicio < Fin)
        if data['hora_inicio'] >= data['hora_fin']:
            raise serializers.ValidationError("La hora de inicio debe ser anterior a la hora de fin.")

        # 2. VALIDACIÓN DE PASADO (Aquí estaba el error 500)
        # Solo validamos si es una fecha específica (override) o "solo por hoy"
        if data.get('fecha'):
            try:
                # A. Construimos la fecha/hora que el usuario quiere crear (Ingenua)
                fecha_input = data['fecha']
                hora_input = data['hora_inicio']
                dt_naive = datetime.datetime.combine(fecha_input, hora_input)

                # B. La volvemos "Consciente" (Aware) usando la zona horaria del servidor (Bogotá)
                # Esto es vital para que Django pueda compararla.
                dt_aware = timezone.make_aware(dt_naive, timezone.get_current_timezone())
                
                # C. Obtenemos la hora actual "Consciente"
                ahora_aware = timezone.now()

                # D. Comparamos manzanas con manzanas
                if dt_aware < ahora_aware:
                    raise serializers.ValidationError("No se puede crear agenda en el pasado.")
            
            except ValueError:
                # Si dt_naive ya venía con zona horaria (raro, pero posible), make_aware falla.
                # En ese caso comparamos directo.
                if dt_naive < timezone.now():
                    raise serializers.ValidationError("No se puede crear agenda en el pasado.")

        # 3. VALIDACIÓN DE SOLAPAMIENTO (OVERLAP)
        overlapping = Disponibilidad.objects.filter(
            profesional_id=data['profesional_id'],
            dia_semana=data['dia_semana'],
            activo=True
        ).filter(
            Q(hora_inicio__lt=data['hora_fin']) & 
            Q(hora_fin__gt=data['hora_inicio'])
        )

        # Si es fecha específica, filtramos colisiones en esa fecha O en recurrentes
        if data.get('fecha'):
            overlapping = overlapping.filter(
                Q(fecha=data['fecha']) | 
                (Q(fecha__isnull=True) & (Q(fecha_fin_vigencia__isnull=True) | Q(fecha_fin_vigencia__gte=data['fecha'])))
            )
        
        # Excluirse a sí mismo si es edición
        if self.instance:
            overlapping = overlapping.exclude(pk=self.instance.pk)

        if overlapping.exists():
            raise serializers.ValidationError("El profesional ya tiene horarios en este rango (conflicto de agenda).")

        return data

class BloqueoAgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloqueoAgenda
        fields = '__all__'

    def validate(self, data):
        if data['fecha_inicio'] >= data['fecha_fin']:
            raise serializers.ValidationError("La fecha de inicio debe ser anterior a la fecha de fin.")
        return data