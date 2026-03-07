from rest_framework import serializers

from .models import Paciente, SolicitudValidacion, TipoPaciente


class TipoPacienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPaciente
        fields = "__all__"


class PacienteSerializer(serializers.ModelSerializer):
    tipo_usuario_nombre = serializers.ReadOnlyField(source="tipo_usuario.nombre")
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = Paciente
        fields = [
            "id",
            "nombre",
            "apellido",
            "nombre_completo",
            "tipo_documento",
            "numero_documento",
            "fecha_nacimiento",
            "genero",
            "direccion",
            "telefono",
            "email_contacto",
            "tipo_usuario",
            "tipo_usuario_nombre",
            "user_id",
            "activo",
            "created_at",
            "updated_at",
            "ultima_fecha_desbloqueo",
        ]

    def get_nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido or ''}".strip()

    def _split_nombre_apellido(self, nombre, apellido):
        nombre = (nombre or "").strip()
        apellido = (apellido or "").strip()
        if not nombre:
            return nombre, apellido
        if apellido:
            return nombre, apellido

        partes = [p for p in nombre.split(" ") if p]
        if len(partes) >= 4:
            return " ".join(partes[:-2]), " ".join(partes[-2:])
        if len(partes) == 3:
            return " ".join(partes[:2]), partes[2]
        if len(partes) == 2:
            return partes[0], partes[1]
        return nombre, apellido

    def validate(self, attrs):
        nombre_actual = attrs.get("nombre", getattr(self.instance, "nombre", ""))
        apellido_actual = attrs.get("apellido", getattr(self.instance, "apellido", ""))
        nombre_norm, apellido_norm = self._split_nombre_apellido(nombre_actual, apellido_actual)
        attrs["nombre"] = nombre_norm
        attrs["apellido"] = apellido_norm
        return attrs


class SolicitudValidacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudValidacion
        fields = "__all__"
