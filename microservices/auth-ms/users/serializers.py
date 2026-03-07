from datetime import timedelta
from django.contrib.auth.models import Group
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Auditoria, CrearCuenta, MenuItem, PermisoVista, SidebarBranding, TipoDocumento


class DependienteSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)

    class Meta:
        model = CrearCuenta
        fields = ["id", "nombre", "apellidos", "nombre_completo", "documento", "tipo_documento", "correo"]


class UserSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)
    dependientes_detalle = DependienteSerializer(source="dependientes", many=True, read_only=True)

    class Meta:
        model = CrearCuenta
        fields = [
            "id",
            "username",
            "correo",
            "nombre",
            "apellidos",
            "nombre_completo",
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
            "apellidos": {"required": False, "allow_blank": True},
        }

    def validate_acepto_tratamiento_datos(self, value):
        if value is not True:
            raise serializers.ValidationError(
                "Es obligatorio aceptar la politica de tratamiento de datos para registrarse."
            )
        return value

    def validate_tipo_documento(self, value):
        # Compatibilidad: si aun no existe catalogo cargado, no bloqueamos el registro.
        if not TipoDocumento.objects.exists():
            return value
        existe_activo = TipoDocumento.objects.filter(codigo=value, activo=True).exists()
        if not existe_activo:
            raise serializers.ValidationError("Tipo de documento no permitido.")
        return value

    def _split_nombre_apellidos(self, nombre, apellidos):
        nombre = (nombre or "").strip()
        apellidos = (apellidos or "").strip()
        if not nombre:
            return nombre, apellidos
        if apellidos:
            return nombre, apellidos

        partes = [p for p in nombre.split(" ") if p]
        if len(partes) >= 4:
            return " ".join(partes[:-2]), " ".join(partes[-2:])
        if len(partes) == 3:
            return " ".join(partes[:2]), partes[2]
        if len(partes) == 2:
            return partes[0], partes[1]
        return nombre, apellidos

    def validate(self, attrs):
        nombre_actual = attrs.get("nombre", getattr(self.instance, "nombre", ""))
        apellidos_actual = attrs.get("apellidos", getattr(self.instance, "apellidos", ""))
        nombre_norm, apellidos_norm = self._split_nombre_apellidos(nombre_actual, apellidos_actual)
        attrs["nombre"] = nombre_norm
        attrs["apellidos"] = apellidos_norm
        return attrs

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
        token["apellidos"] = user.apellidos or ""
        token["nombre_completo"] = user.nombre_completo
        token["email"] = user.correo
        token["is_staff"] = user.is_staff
        token["paciente_id"] = user.paciente_id
        token["profesional_id"] = user.profesional_id
        token["roles"] = list(user.groups.values_list("name", flat=True))

        if user.groups.filter(name="Pantalla Sala").exists():
            # Seteamos la expiracion a 365 dias (1 ano)
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
    dependientes_detalle = DependienteSerializer(source="dependientes", many=True, read_only=True)
    nombre_completo = serializers.CharField(read_only=True)

    class Meta:
        model = CrearCuenta
        fields = [
            "id",
            "email",
            "nombre",
            "apellidos",
            "nombre_completo",
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
        fields = ["id", "label", "url", "icon", "order", "roles", "category_name", "is_active_item"]


class PermisoVistaAdminSerializer(serializers.ModelSerializer):
    roles = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all())

    class Meta:
        model = PermisoVista
        fields = ["id", "codename", "descripcion", "roles"]


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = ["id", "codigo", "nombre", "activo", "orden"]


class SidebarBrandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SidebarBranding
        fields = "__all__"


class AuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Auditoria
        fields = [
            "id",
            "descripcion",
            "usuario_id",
            "fecha",
            "modulo",
            "accion",
            "ip",
            "user_agent",
            "metadata",
            "recurso",
            "recurso_id",
        ]
