from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.models import Group
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CrearCuenta, MenuItem, PermisoVista, SidebarBranding

class DependienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrearCuenta
        fields = ['id', 'nombre', 'documento', 'tipo_documento', 'correo']


class UserSerializer(serializers.ModelSerializer):

    dependientes_detalle = DependienteSerializer(source='dependientes', many=True, read_only=True)

    class Meta:
        model = CrearCuenta
        fields = [
            "id",
            "username",
            "correo",
            "nombre",
            "documento",
            "tipo_documento",
            "numero",
            "password",
            "acepta_tratamiento_datos",
            "paciente_id",
            "profesional_id",
            "is_staff",
            "dependientes_detalle",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "paciente_id": {"required": False, "allow_null": True},
            "profesional_id": {"required": False, "allow_null": True},
        }

    def validate_acepto_tratamiento_datos(self, value):
        if value is not True:
            raise serializers.ValidationError(
                "Es obligatorio aceptar la política de tratamiento de datos para registrarse."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None)
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
        token["documento"] = user.documento
        token["nombre"] = user.nombre
        token["email"] = user.correo
        token["is_staff"] = user.is_staff
        token["paciente_id"] = user.paciente_id
        token["profesional_id"] = user.profesional_id
        token["roles"] = list(user.groups.values_list("name", flat=True))

        if user.groups.filter(name="Pantalla Sala").exists():
            # Seteamos la expiración a 365 días (1 año)
            token.set_exp(lifetime=timedelta(days=365))

        return token


class MenuItemSerializer(serializers.ModelSerializer):
    roles = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all())
    class Meta:
        model = MenuItem
        fields = "__all__"


class PermisoVistaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermisoVista
        fields = ["codename", "descripcion"]


class UserAdminSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(many=True, queryset=Group.objects.all(), slug_field="name")
    dependientes_detalle = DependienteSerializer(source='dependientes', many=True, read_only=True)

    class Meta:
        model = CrearCuenta
        fields = [
            "id",
            "email",
            "nombre",
            "documento",
            "is_active",
            "is_staff",
            "groups",
            "paciente_id",
            "dependientes_detalle",
        ]
        read_only_fields = ["paciente_id"]

class MenuItemAdminSerializer(serializers.ModelSerializer):
    roles = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all())

    class Meta:
        model = MenuItem
        fields = ['id', 'label', 'url', 'icon', 'order', 'roles', 'category_name', 'is_active_item']

class PermisoVistaAdminSerializer(serializers.ModelSerializer):
    roles = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all())

    class Meta:
        model = PermisoVista
        fields = ['id', 'codename', 'descripcion', 'roles']
        
class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class SidebarBrandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SidebarBranding
        fields = '__all__'