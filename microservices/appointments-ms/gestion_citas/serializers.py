from rest_framework import serializers
from .models import Cita, NotaMedica, HistoricoCita, ConfiguracionGlobal

class NotaMedicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotaMedica
        fields = '__all__'

# serializers.py
class CitaSerializer(serializers.ModelSerializer):
    nota_medica = NotaMedicaSerializer(read_only=True, required=False)
    
    # Mapeo de nombres y documentos para lectura
    paciente_nombre = serializers.CharField(source='paciente_nombre_readonly', read_only=True) 
    paciente_doc = serializers.CharField(source='paciente_documento_readonly', read_only=True) # <-- Agregar este
    profesional_nombre = serializers.CharField(source='profesional_nombre_readonly', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio_nombre_readonly', read_only=True) # <-- Agregar este
    lugar_nombre = serializers.CharField(source='lugar_nombre_readonly', read_only=True) # <-- Agregar este

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