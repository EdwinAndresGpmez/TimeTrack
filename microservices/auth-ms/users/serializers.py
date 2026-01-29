from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CrearCuenta, MenuItem, PermisoVista
from django.contrib.auth.models import Group

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrearCuenta
        fields = [
            'id', 'username', 'correo', 'nombre', 
            'documento', 
            'tipo_documento', 'numero', 
            'password',                
            'acepta_tratamiento_datos', 
            'paciente_id', 'profesional_id', 'is_staff'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'paciente_id': {'required': False, 'allow_null': True},
            'profesional_id': {'required': False, 'allow_null': True},
        }

    def validate_acepto_tratamiento_datos(self, value):
        if value is not True:
            raise serializers.ValidationError("Es obligatorio aceptar la política de tratamiento de datos para registrarse.")
        return value

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
        token['documento'] = user.documento  
        token['nombre'] = user.nombre
        token['email'] = user.correo
        token['is_staff'] = user.is_staff
        token['paciente_id'] = user.paciente_id
        token['profesional_id'] = user.profesional_id
        token['roles'] = list(user.groups.values_list('name', flat=True))

        return token

class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = '__all__'


class PermisoVistaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermisoVista
        fields = ['codename', 'descripcion'] 


class UserAdminSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(
        many=True, 
        queryset=Group.objects.all(), 
        slug_field='name'
    )

    class Meta:
        model = CrearCuenta
        fields = ['id', 'email', 'nombre', 'documento', 'is_active', 'is_staff', 'groups', 'paciente_id']
        read_only_fields = ['paciente_id'] 