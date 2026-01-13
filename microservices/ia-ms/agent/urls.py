from django.urls import path
from .views import ChatView, HistoryView

urlpatterns = [
    # Endpoint para enviar mensajes y recibir respuesta de la IA
    path('chat/', ChatView.as_view(), name='chat_message'),
    
    # Endpoint para ver el historial de un usuario específico
    path('history/<int:usuario_id>/', HistoryView.as_view(), name='chat_history'),
]