import datetime

from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from .models import BloqueoAgenda, Disponibilidad


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
            "fecha_inicio_vigencia",
            "fecha_fin_vigencia",
            "activo",
        ]
        read_only_fields = ["usuario_id"]

    def validate(self, data):
        inst = self.instance

        profesional_id = data.get("profesional_id", getattr(inst, "profesional_id", None))
        dia_semana = data.get("dia_semana", getattr(inst, "dia_semana", None))
        hora_inicio = data.get("hora_inicio", getattr(inst, "hora_inicio", None))
        hora_fin = data.get("hora_fin", getattr(inst, "hora_fin", None))
        fecha = data.get("fecha", getattr(inst, "fecha", None))
        fecha_inicio_vigencia = data.get("fecha_inicio_vigencia", getattr(inst, "fecha_inicio_vigencia", None))
        fecha_fin_vigencia = data.get("fecha_fin_vigencia", getattr(inst, "fecha_fin_vigencia", None))
        activo = data.get("activo", getattr(inst, "activo", True))

        if hora_inicio and hora_fin and hora_inicio >= hora_fin:
            raise serializers.ValidationError("La hora de inicio debe ser anterior a la hora de fin.")
        if hora_inicio and hora_fin:
            inicio_min = (hora_inicio.hour * 60) + hora_inicio.minute
            fin_min = (hora_fin.hour * 60) + hora_fin.minute
            duracion = fin_min - inicio_min
            if duracion < 15:
                raise serializers.ValidationError("La duracion minima del bloque es de 15 minutos.")
            if duracion > 720:
                raise serializers.ValidationError("La duracion maxima por bloque es de 12 horas.")

        if fecha and (fecha_inicio_vigencia or fecha_fin_vigencia):
            raise serializers.ValidationError(
                "Una disponibilidad de fecha especifica no debe incluir vigencia recurrente."
            )

        if fecha_inicio_vigencia and fecha_fin_vigencia and fecha_inicio_vigencia > fecha_fin_vigencia:
            raise serializers.ValidationError("La fecha de inicio de vigencia debe ser anterior o igual a la fecha fin.")

        if fecha:
            dt_naive = datetime.datetime.combine(fecha, hora_inicio)
            now_local = timezone.localtime(timezone.now())
            try:
                dt_aware = timezone.make_aware(dt_naive, timezone.get_current_timezone())
                in_past = dt_aware < now_local
            except ValueError:
                in_past = dt_naive < now_local.replace(tzinfo=None)

            if in_past:
                raise serializers.ValidationError("No se puede crear agenda en el pasado.")

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
                        & (Q(fecha_inicio_vigencia__isnull=True) | Q(fecha_inicio_vigencia__lte=fecha))
                        & (Q(fecha_fin_vigencia__isnull=True) | Q(fecha_fin_vigencia__gte=fecha))
                    )
                )
            else:
                overlapping = overlapping.filter(Q(fecha__isnull=True))
                if fecha_inicio_vigencia:
                    overlapping = overlapping.filter(
                        Q(fecha_fin_vigencia__isnull=True) | Q(fecha_fin_vigencia__gte=fecha_inicio_vigencia)
                    )
                if fecha_fin_vigencia:
                    overlapping = overlapping.filter(
                        Q(fecha_inicio_vigencia__isnull=True) | Q(fecha_inicio_vigencia__lte=fecha_fin_vigencia)
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
        fecha_inicio = data.get("fecha_inicio", getattr(self.instance, "fecha_inicio", None))
        fecha_fin = data.get("fecha_fin", getattr(self.instance, "fecha_fin", None))
        profesional_id = data.get("profesional_id", getattr(self.instance, "profesional_id", None))

        if fecha_inicio and fecha_fin and fecha_inicio >= fecha_fin:
            raise serializers.ValidationError("La fecha de inicio debe ser anterior a la fecha de fin.")

        if fecha_inicio and fecha_fin and profesional_id:
            overlapping = BloqueoAgenda.objects.filter(
                profesional_id=profesional_id,
                fecha_inicio__lt=fecha_fin,
                fecha_fin__gt=fecha_inicio,
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError("Ya existe un bloqueo que se cruza con este rango horario.")

        return data
