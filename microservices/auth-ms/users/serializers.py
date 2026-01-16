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
            # Es vital que estos sean opcionales para evitar errores de validación
            'paciente_id': {'required': False, 'allow_null': True},
            'profesional_id': {'required': False, 'allow_null': True},
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        instance = self.Meta.model(**validated_data)
        if password:
            instance.set_password(password) # Encriptamos la contraseña
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
    # Serializamos los grupos para verlos y editarlos
    groups = serializers.SlugRelatedField(
        many=True, 
        queryset=Group.objects.all(), 
        slug_field='name'
    )

    class Meta:
        model = CrearCuenta
        fields = ['id', 'email', 'nombre', 'documento', 'is_active', 'is_staff', 'groups', 'paciente_id']
        read_only_fields = ['paciente_id'] # El admin gestiona usuarios, la vinculación es automática