from rest_framework import serializers

from .models import PQRS, ConvocatoriaHV


class PQRSSerializer(serializers.ModelSerializer):
    class Meta:
        model = PQRS
        fields = "__all__"
        # Estado y respuesta interna son de lectura para el usuario común
        read_only_fields = ["estado", "respuesta_interna", "created_at", "updated_at"]


class ConvocatoriaHVSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConvocatoriaHV
        fields = "__all__"
        read_only_fields = ["leido", "fecha_postulacion"]


class PQRSAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = PQRS
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class ConvocatoriaHVAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConvocatoriaHV
        fields = "__all__"
        read_only_fields = ["fecha_postulacion"]
