import requests
from .models import AIConfiguration, ChatSession, ChatMessage


class AIService:
    def __init__(self):
        # 1. Cargamos la configuración activa de la Base de Datos
        # Busca una config que esté marcada como 'activo=True'
        self.config = AIConfiguration.objects.filter(activo=True).first()

        if not self.config:
            # Si no hay configuración en el Admin, lanzamos error
            raise Exception(
                "No hay configuración de IA activa. Por favor crea una en el Admin."
            )

    def get_response(self, session_id, user_message):
        """
        Orquesta el flujo:
        1. Guarda mensaje usuario
        2. Llama a la IA
        3. Guarda respuesta IA
        4. Retorna el texto
        """
        # A. Recuperar la sesión
        try:
            session = ChatSession.objects.get(id=session_id)
        except ChatSession.DoesNotExist:
            raise Exception("La sesión de chat no existe.")

        # B. Guardar el mensaje del USUARIO en la BD
        ChatMessage.objects.create(session=session, role="user", content=user_message)

        # C. Construir el historial (Contexto) para enviarlo a la IA
        # Tomamos los últimos 10 mensajes para dar contexto sin gastar demasiados tokens
        history = ChatMessage.objects.filter(session=session).order_by("-timestamp")[
            :10
        ]

        # El primer mensaje siempre es el System Prompt (la personalidad del bot)
        messages_payload = [{"role": "system", "content": self.config.system_prompt}]

        # Agregamos el historial ordenado cronológicamente (del más viejo al más nuevo)
        for msg in reversed(history):
            messages_payload.append({"role": msg.role, "content": msg.content})

        # D. Llamar al proveedor de IA (GitHub Models / OpenAI)
        ai_response_text = self._call_provider(messages_payload)

        # E. Guardar la respuesta del ASISTENTE en la BD
        ChatMessage.objects.create(
            session=session, role="assistant", content=ai_response_text
        )

        return ai_response_text

    def _call_provider(self, messages):
        """
        Maneja la conexión HTTP con la API externa (OpenAI / GitHub)
        """
        # URL de inferencia (GitHub Models usa la misma estructura que OpenAI)
        # Si usas OpenAI Real, cambia esto a: https://api.openai.com/v1/chat/completions
        url = "https://models.github.ai/inference/chat/completions"

        # Si tienes configurada una URL específica en el Admin (ej. Azure u Ollama), úsala:
        if self.config.endpoint_url:
            url = self.config.endpoint_url

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.config.api_key}",
        }

        payload = {
            "messages": messages,
            "model": self.config.model_name,  # Ej: gpt-4o-mini
            "temperature": self.config.temperatura,
            "max_tokens": 800,  # Limite de la respuesta
        }

        try:
            # Hacemos la petición POST
            response = requests.post(url, headers=headers, json=payload, timeout=30)

            # Si la API devuelve error (4xx o 5xx), lanzamos excepción
            response.raise_for_status()

            # Procesamos el JSON de respuesta
            data = response.json()

            # Extraemos el texto de la IA
            # Estructura estándar de OpenAI: choices[0].message.content
            return data["choices"][0]["message"]["content"]

        except requests.exceptions.RequestException as e:
            print(f"Error de conexión con IA: {e}")
            # Si hay error, devolvemos un mensaje amigable en vez de romper todo
            if hasattr(e, "response") and e.response is not None:
                return f"Error del proveedor de IA: {e.response.text}"
            return "Lo siento, tengo problemas de conexión con mi cerebro digital en este momento."
        except Exception as e:
            print(f"Error interno IA: {e}")
            return "Ocurrió un error inesperado al procesar tu mensaje."
