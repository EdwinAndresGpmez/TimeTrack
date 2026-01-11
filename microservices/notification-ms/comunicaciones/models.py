from django.db import models

class Notificacion(models.Model):
    # IDs externos
    usuario_id = models.BigIntegerField(db_index=True) # Destinatario (Auth-MS)
    cita_id = models.BigIntegerField(null=True, blank=True) # Opcional: Si es sobre una cita
    
    asunto = models.CharField(max_length=255)
    mensaje = models.TextField()
    
    leida = models.BooleanField(default=False)
    tipo = models.CharField(max_length=50, default='SISTEMA') # EMAIL, PUSH, SISTEMA
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at'] # Las más nuevas primero
        indexes = [
            models.Index(fields=['usuario_id', 'leida']),
        ]

    def __str__(self):
        return f"{self.asunto} - User {self.usuario_id}"