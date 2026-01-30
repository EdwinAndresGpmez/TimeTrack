from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

# Importamos nuestros modelos, serializadores y la lógica del servicio
from .models import ChatSession
from .serializers import ChatSessionSerializer
from .services import AIService


class ChatView(APIView):
    """
    Endpoint principal para interactuar con el chatbot.
    Método: POST
    URL: /api/v1/ia/chat/
    """

    def post(self, request):
        # 1. Extraer datos de la petición
        usuario_id = request.data.get("usuario_id")
        message = request.data.get("message")
        session_id = request.data.get("session_id")  # Opcional: si ya existe una conversación

        # 2. Validaciones básicas
        if not usuario_id or not message:
            return Response(
                {"error": "Faltan datos obligatorios: 'usuario_id' y 'message'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Gestión de la Sesión (Recuperar o Crear)
        if session_id:
            # Si envían ID, buscamos esa sesión específica de ese usuario
            session = get_object_or_404(ChatSession, id=session_id, usuario_id=usuario_id)
        else:
            # Si no hay ID, creamos una sesión nueva.
            # El título lo generamos con los primeros 30 caracteres del mensaje.
            session = ChatSession.objects.create(usuario_id=usuario_id, titulo=message[:30] + "...")

        # 4. Llamar al Cerebro de la IA (Service Layer)
        try:
            ai_service = AIService()
            # Esta función (que creamos en services.py) hace todo:
            # guarda tu mensaje -> llama a GitHub/OpenAI -> guarda respuesta -> retorna texto
            response_text = ai_service.get_response(session.id, message)

            # 5. Responder al Frontend
            return Response(
                {
                    "status": "success",
                    "session_id": session.id,
                    "response": response_text,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            # Capturamos errores (ej: sin internet, api key inválida, etc.)
            print(f"Error en ChatView: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HistoryView(APIView):
    """
    Endpoint para ver el historial de conversaciones de un usuario.
    Método: GET
    URL: /api/v1/ia/history/<int:usuario_id>/
    """

    def get(self, request, usuario_id):
        # Buscamos todas las sesiones activas de ese usuario
        sessions = ChatSession.objects.filter(usuario_id=usuario_id, activo=True).order_by(
            "-updated_at"
        )  # Las más recientes primero

        # Serializamos los datos (convertimos objetos Python a JSON)
        serializer = ChatSessionSerializer(sessions, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)
