import datetime
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from .models import Disponibilidad, BloqueoAgenda

class DisponibilidadSerializer(serializers.ModelSerializer):
    dia_nombre = serializers.CharField(source="get_dia_semana_display", read_only=True)

    class Meta:
        model = Disponibilidad
        fields = [
            "id",
            "usuario_id",
            "profesional_id",
            "lugar_id",
            "servicio_id",
            "dia_semana",
            "dia_nombre",
            "hora_inicio",
            "hora_fin",
            "fecha",
            "fecha_fin_vigencia",
            "activo",
        ]
        read_only_fields = ["usuario_id"]

    def validate(self, data):
        # ✅ soporta PATCH: toma valores del instance si no vienen
        inst = self.instance

        profesional_id = data.get("profesional_id", getattr(inst, "profesional_id", None))
        dia_semana = data.get("dia_semana", getattr(inst, "dia_semana", None))
        hora_inicio = data.get("hora_inicio", getattr(inst, "hora_inicio", None))
        hora_fin = data.get("hora_fin", getattr(inst, "hora_fin", None))
        fecha = data.get("fecha", getattr(inst, "fecha", None))
        activo = data.get("activo", getattr(inst, "activo", True))

        # 1) coherencia horas
        if hora_inicio and hora_fin and hora_inicio >= hora_fin:
            raise serializers.ValidationError("La hora de inicio debe ser anterior a la hora de fin.")

        # 2) no permitir crear agenda en el pasado (solo para fecha específica)
        # (si es update y ya existía en el pasado, tú decides si permitir)
        if fecha:
            try:
                dt_naive = datetime.datetime.combine(fecha, hora_inicio)
                dt_aware = timezone.make_aware(dt_naive, timezone.get_current_timezone())
                if dt_aware < timezone.now():
                    raise serializers.ValidationError("No se puede crear agenda en el pasado.")
            except ValueError:
                if dt_naive < timezone.now():
                    raise serializers.ValidationError("No se puede crear agenda en el pasado.")

        # 3) overlap solo si activo True (si activo False, no debería bloquear)
        if activo and profesional_id is not None and dia_semana is not None and hora_inicio and hora_fin:
            overlapping = Disponibilidad.objects.filter(
                profesional_id=profesional_id,
                dia_semana=dia_semana,
                activo=True,
            ).filter(Q(hora_inicio__lt=hora_fin) & Q(hora_fin__gt=hora_inicio))

            if fecha:
                overlapping = overlapping.filter(
                    Q(fecha=fecha)
                    | (
                        Q(fecha__isnull=True)
                        & (Q(fecha_fin_vigencia__isnull=True) | Q(fecha_fin_vigencia__gte=fecha))
                    )
                )

            if inst:
                overlapping = overlapping.exclude(pk=inst.pk)

            if overlapping.exists():
                raise serializers.ValidationError(
                    "El profesional ya tiene horarios en este rango (conflicto de agenda)."
                )

        return data


class BloqueoAgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloqueoAgenda
        fields = "__all__"
        read_only_fields = ["usuario_id"]

    def validate(self, data):
        if data["fecha_inicio"] >= data["fecha_fin"]:
            raise serializers.ValidationError("La fecha de inicio debe ser anterior a la fecha de fin.")
        return data
