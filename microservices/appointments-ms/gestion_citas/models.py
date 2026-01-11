from django.db import models

class Cita(models.Model):
    ESTADOS = [
        ('PROGRAMADA', 'Programada'),
        ('CONFIRMADA', 'Confirmada'),
        ('CANCELADA', 'Cancelada'),
        ('REALIZADA', 'Realizada'), # Ya atendida
        ('NO_ASISTIO', 'No Asistió'),
    ]

    # --- Referencias Externas (IDs) ---
    usuario_id = models.BigIntegerField(null=True, blank=True) # Quien pidió la cita
    profesional_id = models.BigIntegerField(db_index=True)     # MS-8002
    lugar_id = models.BigIntegerField(null=True, blank=True)   # MS-8002
    horario_id = models.BigIntegerField(null=True, blank=True) # MS-8003
    paciente_id = models.BigIntegerField(db_index=True)        # MS-8001
    servicio_id = models.BigIntegerField(null=True, blank=True)# MS-8002

    # --- Datos de la Cita ---
    fecha = models.DateField()
    hora_inicio = models.TimeField() 
    hora_fin = models.TimeField()
    
    nota = models.TextField(blank=True, null=True, verbose_name="Nota inicial")
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PROGRAMADA')
    activo = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cita {self.id} - {self.fecha} ({self.estado})"

class NotaMedica(models.Model):
    """
    Información clínica diligenciada por el médico durante la consulta.
    Reemplaza al modelo 'Consultorio' del legacy.
    """
    cita = models.OneToOneField(Cita, on_delete=models.CASCADE, related_name='nota_medica')
    contenido = models.TextField(verbose_name="Evolución / Nota Médica")
    diagnostico = models.TextField(blank=True, null=True)
    
    # Snapshot: Guardamos la edad/nacimiento del paciente AL MOMENTO de la cita
    nacimiento_paciente_snapshot = models.DateField(null=True, blank=True)
    
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Nota Cita #{self.cita.id}"

class HistoricoCita(models.Model):
    """
    Tabla desnormalizada para reportes rápidos y auditoría.
    Se llena automáticamente cuando una cita cambia de estado.
    """
    cita_original_id = models.BigIntegerField(db_index=True)
    
    # IDs originales
    profesional_id = models.IntegerField(null=True)
    paciente_id = models.IntegerField(null=True)
    servicio_id = models.IntegerField(null=True)
    
    # Texto Plano (Snapshots para no perder info si borran el catálogo)
    nombre_profesional = models.CharField(max_length=255, blank=True, null=True)
    nombre_paciente = models.CharField(max_length=255, blank=True, null=True)
    nombre_servicio = models.CharField(max_length=255, blank=True, null=True)
    nombre_lugar = models.CharField(max_length=255, blank=True, null=True)
    
    # Fechas
    fecha_cita = models.DateField()
    hora_inicio = models.TimeField()
    
    estado = models.CharField(max_length=50)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Histórico {self.cita_original_id} - {self.estado}"