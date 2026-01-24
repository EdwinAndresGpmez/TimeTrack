from rest_framework import serializers
from .models import Paciente, TipoPaciente, SolicitudValidacion

class TipoPacienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPaciente
        fields = '__all__'

class PacienteSerializer(serializers.ModelSerializer):
    # Campo calculado para mostrar el nombre del tipo en lugar de solo el ID
    tipo_usuario_nombre = serializers.ReadOnlyField(source='tipo_usuario.nombre')

    class Meta:
        model = Paciente
        fields = [
            'id', 'nombre', 'apellido', 'tipo_documento', 'numero_documento',
            'fecha_nacimiento', 'genero', 'direccion', 'telefono', 
            'email_contacto', 'tipo_usuario', 'tipo_usuario_nombre', 
            'user_id', 'activo', 'created_at', 'updated_at'
        ]

class SolicitudValidacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudValidacion
        fields = '__all__'