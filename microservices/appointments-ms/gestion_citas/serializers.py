from rest_framework import serializers
from .models import Cita, NotaMedica, HistoricoCita, ConfiguracionGlobal

class NotaMedicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotaMedica
        fields = '__all__'

class CitaSerializer(serializers.ModelSerializer):
    # Opcional: Incluir la nota médica anidada si se quiere ver todo junto
    nota_medica = NotaMedicaSerializer(read_only=True, required=False)

    class Meta:
        model = Cita
        fields = '__all__'

class HistoricoCitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoricoCita
        fields = '__all__'

class ConfiguracionGlobalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionGlobal
        fields = '__all__'