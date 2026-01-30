from rest_framework import serializers

from .models import AIConfiguration, ChatMessage, ChatSession


class AIConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConfiguration
        fields = "__all__"
        # Ocultamos la API Key al leer para seguridad, solo escritura
        extra_kwargs = {"api_key": {"write_only": True}}


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["role", "content", "timestamp"]


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = ["id", "usuario_id", "titulo", "created_at", "messages"]
