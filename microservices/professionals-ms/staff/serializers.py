from rest_framework import serializers

from .models import Especialidad, Lugar, Profesional, Servicio


class EspecialidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = "__all__"


class LugarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lugar
        fields = "__all__"


class ProfesionalSerializer(serializers.ModelSerializer):
    # Campo calculado para leer nombres
    especialidades_nombres = serializers.StringRelatedField(many=True, source="especialidades", read_only=True)

    # IMPORTANTE: Definimos la relación inversa para poder escribirla
    # 'servicios_habilitados' es el related_name que pusimos en el modelo Servicio
    servicios_habilitados = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Servicio.objects.all(), required=False
    )

    class Meta:
        model = Profesional
        fields = [
            "id",
            "nombre",
            "numero_documento",
            "registro_medico",
            "email_profesional",
            "telefono_profesional",
            "especialidades",
            "especialidades_nombres",
            "lugares_atencion",
            "servicios_habilitados",
            "activo",
        ]


class ServicioSerializer(serializers.ModelSerializer):
    total_profesionales = serializers.SerializerMethodField()

    class Meta:
        model = Servicio
        fields = [
            "id",
            "nombre",
            "descripcion",
            "duracion_minutos",
            "buffer_minutos",
            "precio_base",
            "activo",
            "profesionales",
            "total_profesionales",
            "tipos_paciente_ids",
        ]

    def get_total_profesionales(self, obj):
        return obj.profesionales.count()
