from rest_framework import serializers
from .models import Cita, NotaMedica, HistoricoCita, ConfiguracionGlobal

class NotaMedicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotaMedica
        fields = '__all__'

class CitaSerializer(serializers.ModelSerializer):
    nota_medica = NotaMedicaSerializer(read_only=True, required=False)
    
    # --- AJUSTE CLAVE ---
    # Usamos SerializerMethodField para crear estos campos en el JSON de respuesta.
    # Inicialmente devuelven None, pero el ViewSet 'inyectará' los datos reales
    # traídos de los otros microservicios (Patients-MS y Professionals-MS).
    paciente_nombre = serializers.SerializerMethodField()
    paciente_doc = serializers.SerializerMethodField()
    profesional_nombre = serializers.SerializerMethodField()
    servicio_nombre = serializers.SerializerMethodField()
    lugar_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Cita
        fields = '__all__'

    def get_paciente_nombre(self, obj):
        return getattr(obj, 'paciente_nombre', None)

    def get_paciente_doc(self, obj):
        return getattr(obj, 'paciente_doc', None)

    def get_profesional_nombre(self, obj):
        return getattr(obj, 'profesional_nombre', None)

    def get_servicio_nombre(self, obj):
        return getattr(obj, 'servicio_nombre', None)

    def get_lugar_nombre(self, obj):
        return getattr(obj, 'lugar_nombre', None)

class HistoricoCitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricoCita
        fields = '__all__'

class ConfiguracionGlobalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionGlobal
        fields = '__all__'