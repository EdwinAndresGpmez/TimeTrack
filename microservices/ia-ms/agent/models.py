from django.db import models

class AIConfiguration(models.Model):
    """
    Permite parametrizar la conexión a la IA desde el Admin o Frontend
    sin tocar código.
    """
    PROVEEDORES = [
        ('OPENAI', 'OpenAI (GPT)'),
        ('AZURE', 'Azure OpenAI'),
        ('OLLAMA', 'Ollama (Local)'),
        ('GITHUB', 'GitHub Models'),
    ]

    nombre = models.CharField(max_length=100, default="Configuración Principal")
    proveedor = models.CharField(max_length=20, choices=PROVEEDORES, default='GITHUB')
    
    # Credenciales y Endpoints
    api_key = models.CharField(max_length=255, help_text="Token de GitHub, OpenAI Key, etc.")
    endpoint_url = models.CharField(max_length=255, blank=True, null=True, help_text="Solo si usa Azure u Ollama")
    model_name = models.CharField(max_length=100, default="gpt-4o-mini", help_text="Ej: gpt-4o, llama-3")
    
    # El "Cerebro" (System Prompt)
    system_prompt = models.TextField(
        default="Eres un asistente médico virtual de la Clínica TimeTrack. Tu objetivo es ayudar a agendar citas. Sé amable, conciso y profesional.",
        help_text="Instrucciones base para el comportamiento del bot."
    )
    
    temperatura = models.FloatField(default=0.7, help_text="Creatividad (0.0 a 1.0)")
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} ({self.proveedor})"

class ChatSession(models.Model):
    """
    Agrupa los mensajes de una conversación.
    """
    # Guardamos el ID del usuario del Auth-MS, no una ForeignKey directa porque son microservicios distintos
    usuario_id = models.BigIntegerField(db_index=True) 
    
    titulo = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"Sesión {self.id} - User {self.usuario_id}"

class ChatMessage(models.Model):
    """
    Historial de mensajes individual.
    """
    ROLES = [
        ('user', 'Usuario'),
        ('assistant', 'IA'),
        ('system', 'Sistema'),
    ]

    session = models.ForeignKey(ChatSession, related_name='messages', on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLES)
    content = models.TextField()
    
    # Metadatos opcionales (ej: tokens usados)
    tokens_used = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']