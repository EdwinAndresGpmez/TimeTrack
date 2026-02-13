from rest_framework import serializers

from .models import Cita, ConfiguracionGlobal, HistoricoCita, NotaMedica


class NotaMedicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotaMedica
        fields = "__all__"


class CitaSerializer(serializers.ModelSerializer):
    nota_medica = NotaMedicaSerializer(read_only=True, required=False)

    # Campos calculados (se llenan en el ViewSet via _enrich_data)
    paciente_nombre = serializers.SerializerMethodField()
    paciente_doc = serializers.SerializerMethodField()
    profesional_nombre = serializers.SerializerMethodField()
    servicio_nombre = serializers.SerializerMethodField()
    lugar_nombre = serializers.SerializerMethodField()
    paciente_fecha_nacimiento = serializers.SerializerMethodField()

    class Meta:
        model = Cita
        fields = "__all__"

    def get_paciente_nombre(self, obj):
        return getattr(obj, "paciente_nombre", None)

    def get_paciente_doc(self, obj):
        return getattr(obj, "paciente_doc", None)

    def get_profesional_nombre(self, obj):
        return getattr(obj, "profesional_nombre", None)

    def get_servicio_nombre(self, obj):
        return getattr(obj, "servicio_nombre", None)

    def get_lugar_nombre(self, obj):
        return getattr(obj, "lugar_nombre", None)
    
    def get_paciente_fecha_nacimiento(self, obj):
        return getattr(obj, "paciente_fecha_nacimiento", None)


class HistoricoCitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricoCita
        fields = "__all__"


class ConfiguracionGlobalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionGlobal
        fields = "__all__"
