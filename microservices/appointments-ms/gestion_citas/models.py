from django.db import models

class Cita(models.Model):
    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),   
        ('ACEPTADA', 'Aceptada'),     
        ('CANCELADA', 'Cancelada'),   
        ('REALIZADA', 'Realizada'),   
        ('NO_ASISTIO', 'No Asistió'),
        ('EN_SALA', 'En Sala de Espera'), # <--- NUEVO ESTADO: Paciente llegó y está listo
    ]

    # ... (Referencias Externas iguales) ...
    usuario_id = models.BigIntegerField(null=True, blank=True)
    profesional_id = models.BigIntegerField(db_index=True)
    lugar_id = models.BigIntegerField(null=True, blank=True)
    horario_id = models.BigIntegerField(null=True, blank=True)
    paciente_id = models.BigIntegerField(db_index=True)
    servicio_id = models.BigIntegerField(null=True, blank=True)

    # --- Datos de la Cita ---
    fecha = models.DateField()
    hora_inicio = models.TimeField() 
    hora_fin = models.TimeField()
    
    # Nota que escribe el PACIENTE al pedir la cita
    nota = models.TextField(blank=True, null=True, verbose_name="Nota inicial del paciente")
    
    # --- NUEVO CAMPO ---
    # Nota que escribe la SECRETARIA/RECEPCIÓN (Signos vitales, copago, alertas)
    nota_interna = models.TextField(blank=True, null=True, verbose_name="Nota de Recepción/Administrativa")

    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE', db_index=True)
    
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha', '-hora_inicio']
        verbose_name = "Cita"
        verbose_name_plural = "Citas"

    def __str__(self):
        return f"Cita {self.id} - {self.fecha} ({self.get_estado_display()})"

class NotaMedica(models.Model):
    """
    Información clínica diligenciada por el médico.
    Equivale al modelo 'Consultorio' del Legacy.
    """
    cita = models.OneToOneField(Cita, on_delete=models.CASCADE, related_name='nota_medica')
    contenido = models.TextField(verbose_name="Evolución / Nota Médica")
    diagnostico = models.TextField(blank=True, null=True)
    
    # Snapshot: Edad del paciente al momento de la consulta (Vital para pediatría/geriatría)
    nacimiento_paciente_snapshot = models.DateField(null=True, blank=True)
    
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Nota Cita #{self.cita.id}"

class HistoricoCita(models.Model):
    """
    Auditoría completa. Se llena vía Signals o en el ViewSet cuando cambia el estado.
    """
    cita_original_id = models.BigIntegerField(db_index=True)
    
    # Copia de IDs
    profesional_id = models.IntegerField(null=True)
    paciente_id = models.IntegerField(null=True)
    servicio_id = models.IntegerField(null=True)
    lugar_id = models.IntegerField(null=True) # Faltaba agregar este campo en tu modelo anterior
    
    # SNAPSHOTS DE TEXTO: Esto es vital en microservicios.
    # Si borran al médico en el otro microservicio, aquí conservamos su nombre para el reporte.
    nombre_profesional = models.CharField(max_length=255, blank=True, null=True)
    nombre_paciente = models.CharField(max_length=255, blank=True, null=True)
    nombre_servicio = models.CharField(max_length=255, blank=True, null=True)
    nombre_lugar = models.CharField(max_length=255, blank=True, null=True)
    
    # Datos de tiempo
    fecha_cita = models.DateField()
    hora_inicio = models.TimeField()
    
    estado = models.CharField(max_length=50)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    usuario_responsable = models.CharField(max_length=100, null=True, blank=True) # Quién hizo el cambio

    def __str__(self):
        return f"Histórico {self.cita_original_id} - {self.estado} ({self.fecha_registro})"
    

class ConfiguracionGlobal(models.Model):
    """
    Tabla Singleton (Solo 1 registro) para reglas de negocio parametrizables.
    """
    horas_antelacion_cancelar = models.IntegerField(
        default=24, 
        verbose_name="Horas mínimas para cancelar"
    )
    
    # Aquí puedes agregar más reglas a futuro (Ej: max_citas_dia, hora_apertura, etc.)
    mensaje_notificacion_cancelacion = models.TextField(
        default="Su cita ha sido cancelada.", 
        verbose_name="Mensaje default al cancelar"
    )

    def save(self, *args, **kwargs):
        # Garantizar que siempre sea el ID 1 (Singleton)
        self.pk = 1
        super(ConfiguracionGlobal, self).save(*args, **kwargs)

    def __str__(self):
        return "Configuración Global del Sistema"