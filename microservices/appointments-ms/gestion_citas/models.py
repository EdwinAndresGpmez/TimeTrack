from django.db import models
import copy

# Definimos el flujo por defecto para mantener la compatibilidad inicial
DEFAULT_WORKFLOW = [
    {
        "slug": "PENDIENTE",
        "label": "Por Revisar",
        "color": "yellow",
        "icon": "FaClock",
        "acciones": [
            {"target": "ACEPTADA", "label": "Aceptar", "tipo": "success", "requiere_motivo": False},
            {"target": "RECHAZADA", "label": "Rechazar", "tipo": "danger", "requiere_motivo": True}
        ]
    },
    {
        "slug": "ACEPTADA",
        "label": "Aceptadas",
        "color": "green",
        "icon": "FaCheckCircle",
        "acciones": [
            {"target": "EN_SALA", "label": "Llegó a Sala", "tipo": "indigo", "requiere_motivo": False},
            {"target": "NO_ASISTIO", "label": "No Asistió", "tipo": "gray", "requiere_motivo": False},
            {"target": "CANCELADA", "label": "Cancelar", "tipo": "warning", "requiere_motivo": True}
        ]
    },
    {
        "slug": "EN_SALA",
        "label": "En Sala",
        "color": "indigo",
        "icon": "FaHourglassHalf",
        "acciones": [
            {"target": "REALIZADA", "label": "Finalizar Atención", "tipo": "blue", "requiere_nota_medica": True},
            {"target": "CANCELADA", "label": "Cancelar", "tipo": "warning", "requiere_motivo": True}
        ]
    },
    {
        "slug": "REALIZADA",
        "label": "Realizadas",
        "color": "blue",
        "icon": "FaCalendarCheck",
        "acciones": []
    },
    {
        "slug": "CANCELADA",
        "label": "Canceladas",
        "color": "red",
        "icon": "FaBan",
        "acciones": []
    },
    {
        "slug": "RECHAZADA",
        "label": "Rechazadas",
        "color": "gray",
        "icon": "FaTimesCircle",
        "acciones": []
    },
    {
        "slug": "NO_ASISTIO",
        "label": "No Asistió",
        "color": "gray",
        "icon": "FaUserClock",
        "acciones": []
    }
]

# 🔹 Función callable para evitar que el JSONField comparta la misma instancia
def default_workflow():
    return copy.deepcopy(DEFAULT_WORKFLOW)


class Cita(models.Model):
    estado = models.CharField(max_length=50, default="PENDIENTE", db_index=True)

    usuario_id = models.BigIntegerField(null=True, blank=True)
    profesional_id = models.BigIntegerField(db_index=True)
    lugar_id = models.BigIntegerField(null=True, blank=True)
    horario_id = models.BigIntegerField(null=True, blank=True)
    paciente_id = models.BigIntegerField(db_index=True)
    servicio_id = models.BigIntegerField(null=True, blank=True)

    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    nota = models.TextField(blank=True, null=True, verbose_name="Nota inicial del paciente")
    nota_interna = models.TextField(blank=True, null=True, verbose_name="Nota de Recepción/Administrativa")

    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fecha", "-hora_inicio"]
        verbose_name = "Cita"
        verbose_name_plural = "Citas"

    def __str__(self):
        return f"Cita {self.id} - {self.fecha} ({self.estado})"


class NotaMedica(models.Model):
    cita = models.OneToOneField(Cita, on_delete=models.CASCADE, related_name="nota_medica")
    contenido = models.TextField(verbose_name="Evolución / Nota Médica")
    diagnostico = models.TextField(blank=True, null=True)
    nacimiento_paciente_snapshot = models.DateField(null=True, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Nota Cita #{self.cita.id}"


class HistoricoCita(models.Model):
    cita_original_id = models.BigIntegerField(db_index=True)
    profesional_id = models.IntegerField(null=True)
    paciente_id = models.IntegerField(null=True)
    servicio_id = models.IntegerField(null=True)
    lugar_id = models.IntegerField(null=True)
    nombre_profesional = models.CharField(max_length=255, blank=True, null=True)
    nombre_paciente = models.CharField(max_length=255, blank=True, null=True)
    nombre_servicio = models.CharField(max_length=255, blank=True, null=True)
    nombre_lugar = models.CharField(max_length=255, blank=True, null=True)
    fecha_cita = models.DateField()
    hora_inicio = models.TimeField()
    estado = models.CharField(max_length=50)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    usuario_responsable = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"Histórico {self.cita_original_id} - {self.estado}"


class ConfiguracionGlobal(models.Model):
    horas_antelacion_cancelar = models.IntegerField(default=24, verbose_name="Horas mínimas para cancelar")
    dias_para_actualizar_datos = models.IntegerField(default=180)
    mensaje_notificacion_cancelacion = models.TextField(
        default="Su cita ha sido cancelada.",
        verbose_name="Mensaje default al cancelar"
    )
    max_citas_dia_paciente = models.IntegerField(default=1)
    permitir_mismo_servicio_dia = models.BooleanField(default=False)
    limite_inasistencias = models.IntegerField(default=3)
    mensaje_bloqueo_inasistencia = models.TextField(
        default="Su cuenta ha sido bloqueada por inasistencias reiteradas.",
        blank=True
    )

    # 🔹 Motor dinámico de estados (corregido)
    workflow_citas = models.JSONField(
        default=default_workflow,
        verbose_name="Flujo de Estados Dinámico"
    )

    grupos_excepcion_antelacion = models.TextField(
        default="Administrador, Recepcion",
        help_text="Nombres de grupos que pueden saltarse la restricción de 1 hora, separados por coma."
    )

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return "Configuración Global del Sistema"
