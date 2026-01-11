from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CrearCuenta, MenuItem, PermisoVista

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrearCuenta
        fields = [
            'id', 'username', 'email', 'nombre', 
            'documento', # <-- Cambio aquí
            'tipo_documento', 'numero', 'paciente_id', 
            'profesional_id', 'is_staff'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Personalizamos el token para incluir roles y IDs de enlace
    directamente en el payload del JWT.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Claims actualizados
        token['documento'] = user.documento  # <-- Cambio aquí: ahora es genérico
        token['nombre'] = user.nombre
        token['is_staff'] = user.is_staff
        token['paciente_id'] = user.paciente_id
        token['profesional_id'] = user.profesional_id
        token['roles'] = list(user.groups.values_list('name', flat=True))

        return token

class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = '__all__'