1. Microservicio de Autenticación y Configuración (auth-ms)
Responsabilidad: Identidad, Seguridad, Roles y Configuración de UI (Menús).

Modelo: User (Hereda de CrearCuenta legacy)
Python

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    nombre_completo = models.CharField(max_length=255)
    
    # Datos de Identificación (Legacy: cedula, tipo_documento, numero)
    cedula = models.CharField(max_length=255, unique=True, db_index=True) # USERNAME_FIELD
    tipo_documento = models.CharField(max_length=20)
    numero_contacto = models.CharField(max_length=255)
    
    # Referencias Desacopladas
    paciente_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    profesional_id = models.BigIntegerField(null=True, blank=True, db_index=True)

    # Auditoría y Estado
    acepta_tratamiento_datos = models.BooleanField(default=False)
    usuario_estado = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'cedula'
    REQUIRED_FIELDS = ['username', 'email', 'nombre_completo']
Modelo: Auditoria (Legacy: Auditoria)
Registro centralizado de eventos de seguridad y cambios importantes.

Python

class Auditoria(models.Model):
    descripcion = models.TextField() # legacy: descripcion_aut
    usuario_id = models.BigIntegerField(null=True) # Quién hizo la acción
    fecha = models.DateTimeField(auto_now_add=True)
    modulo = models.CharField(max_length=100, default='GENERAL') # Para filtrar por MS
Modelos: ConfiguracionUI (Legacy: MenuItem, PermisoVista)
Para mantener la gestión dinámica del frontend desde el backend.

Python

class PermisoVista(models.Model):
    nombre_vista = models.CharField(max_length=255, unique=True)
    # Usamos los Grupos de Django (auth_group)
    roles_permitidos = models.ManyToManyField('auth.Group')

class MenuItem(models.Model):
    label = models.CharField(max_length=100)
    url = models.CharField(max_length=200)
    icon = models.CharField(max_length=100, blank=True, null=True)
    order = models.IntegerField(default=0)
    roles = models.ManyToManyField('auth.Group', blank=True)
    
    class Meta:
        ordering = ["order"]
2. Microservicio de Pacientes (patients-ms)
Responsabilidad: Gestión de datos demográficos de pacientes.

Modelo: TipoPaciente (Legacy: TipoUsuario)
Python

class TipoPaciente(models.Model):
    nombre = models.CharField(max_length=100, unique=True) # legacy: nombre_tipo
    activo = models.BooleanField(default=True) # legacy: estado_tipo
Modelo: Paciente (Legacy: Pacientes)
Python

class Paciente(models.Model):
    TIPO_DOC_CHOICES = [
        ("CC", "Cédula de ciudadanía"), ("NIT", "NIT"), ("RC", "Registro Civil"),
        ("TI", "Tarjeta de identidad"), ("CE", "Cédula de extranjería"), ("PA", "Pasaporte"),
        # ... resto de opciones legacy
    ]
    
    nombre = models.CharField(max_length=255) # legacy: nombre_pac
    tipo_documento = models.CharField(max_length=10, choices=TIPO_DOC_CHOICES) # legacy: tipo_doc
    numero_documento = models.CharField(max_length=20, unique=True, db_index=True) # legacy: num_doc
    
    fecha_nacimiento = models.DateField() # legacy: nacimiento_pac
    genero = models.CharField(max_length=20, choices=[("M", "Masculino"), ("F", "Femenino"), ("O", "Otro")])
    direccion = models.CharField(max_length=255, blank=True, null=True)
    
    # Relación interna
    tipo_usuario = models.ForeignKey(TipoPaciente, on_delete=models.SET_NULL, null=True)
    
    activo = models.BooleanField(default=True) # legacy: pacientes_estado
3. Microservicio de Profesionales (professionals-ms)
Responsabilidad: Staff, Lugares y Servicios.

Modelo: Lugar (Legacy: Lugares)
Python

class Lugar(models.Model):
    nombre = models.CharField(max_length=255, blank=True, null=True) # legacy: nombre_lugar
    ubicacion = models.CharField(max_length=255, blank=True, null=True) # legacy: ubicacion_lugar
    activo = models.BooleanField(default=True) # legacy: lugares_estado
Modelo: Servicio (Legacy: Servicio)
Python

class Servicio(models.Model):
    nombre = models.CharField(max_length=255, unique=True) # legacy: nombre_servicio
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True) # legacy: servicio_estado
Modelo: Profesional (Legacy: Profesional)
Python

class Profesional(models.Model):
    nombre = models.CharField(max_length=255) # legacy: nombre_prof
    numero_documento = models.CharField(max_length=20, unique=True) # legacy: num_doc_prof
    especialidad = models.CharField(max_length=255) # legacy: especialidad_prof
    telefono = models.CharField(max_length=15, null=True, blank=True, unique=True)
    email = models.EmailField(null=True, blank=True, unique=True)
    
    activo = models.BooleanField(default=True) # legacy: estado_prof
    
    # Relaciones ManyToMany internas
    lugares = models.ManyToManyField(Lugar, related_name="profesionales")
    servicios = models.ManyToManyField(Servicio, related_name="profesionales", blank=True)
4. Microservicio de Programación (schedule-ms)
Responsabilidad: Disponibilidad y Agenda (Legacy: Horas).

Modelo: Disponibilidad (Legacy: Horas)
Representa los bloques de tiempo habilitados.

Python

from datetime import date

class Disponibilidad(models.Model):
    # IDs externos
    profesional_id = models.BigIntegerField(db_index=True) # legacy: id_prof
    servicio_id = models.BigIntegerField(null=True, blank=True) # legacy: servicio
    
    # Tiempos
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    fecha = models.DateField(default=date.today) # legacy: fecha_habilitada
    
    activo = models.BooleanField(default=True) # legacy: horas_estado

    def clean(self):
        # Aquí irá la lógica de validación (inicio < fin) del modelo legacy
        pass
5. Microservicio de Citas (appointments-ms)
Responsabilidad: Citas, Histórico y Notas Médicas (Legacy Citas, HistoricoCitas, Consultorio).

Modelo: Cita (Legacy: Citas)
Python

class Cita(models.Model):
    # IDs externos
    usuario_id = models.BigIntegerField(null=True, blank=True) # legacy: id_usu
    profesional_id = models.BigIntegerField(null=True, blank=True, db_index=True) # legacy: id_prof
    lugar_id = models.BigIntegerField(null=True, blank=True) # legacy: id_lugar
    horario_id = models.BigIntegerField(null=True, blank=True) # legacy: id_hora (Referencia a Schedule-MS)
    paciente_id = models.BigIntegerField(null=True, blank=True, db_index=True) # legacy: id_pac
    servicio_id = models.BigIntegerField(null=True, blank=True) # legacy: id_servicio

    # Datos Cita
    fecha = models.DateField() # legacy: dia_cit
    nota = models.TextField(blank=True, null=True) # legacy: nota_cit
    estado = models.CharField(max_length=100) # legacy: estado_cita
    activo = models.BooleanField(default=True) # legacy: citas_estado
    
    created_at = models.DateTimeField(auto_now_add=True)
Modelo: NotaMedica (Legacy: Consultorio)
Información clínica asociada a la cita.

Python

class NotaMedica(models.Model):
    cita = models.OneToOneField(Cita, on_delete=models.CASCADE, related_name='nota_medica') # legacy: id_cit
    contenido = models.TextField() # legacy: nota_con
    nacimiento_paciente_snapshot = models.DateField(null=True, blank=True) # legacy: nacimiento_con
    
    # Redundancia necesaria si el profesional cambia, mantiene quién atendió
    profesional_id = models.BigIntegerField(null=True) # legacy: id_prof
    
    activo = models.BooleanField(default=True) # legacy: consultorio_estado
Modelo: HistoricoCita (Legacy: HistoricoCitas)
Tabla desnormalizada para reportes rápidos y auditoría de citas.

Python

class HistoricoCita(models.Model):
    # IDs originales
    cita_original_id = models.BigIntegerField(null=True)
    usuario_id = models.IntegerField(null=True)
    profesional_id = models.IntegerField(null=True)
    paciente_id = models.IntegerField(null=True)
    
    # Snapshots de texto (Como estaba en legacy, para no perder info si se borran catálogos)
    nombre_usuario = models.CharField(max_length=255, blank=True, null=True)
    nombre_profesional = models.CharField(max_length=255, blank=True, null=True)
    especialidad_profesional = models.CharField(max_length=255, blank=True, null=True)
    nombre_lugar = models.CharField(max_length=255, blank=True, null=True)
    nombre_paciente = models.CharField(max_length=255, blank=True, null=True)
    nombre_servicio = models.CharField(max_length=255, blank=True, null=True)
    
    # Fechas
    fecha_cita = models.DateField()
    inicio_hora = models.TimeField(null=True)
    final_hora = models.TimeField(null=True)
    
    # Metadatos
    estado_cita = models.CharField(max_length=100)
    fecha_registro = models.DateTimeField(auto_now_add=True) # legacy: fecha_historico
6. Microservicio de Notificaciones (notification-ms)
Responsabilidad: Envío de mensajes (Legacy: Notificacion).

Modelo: Notificacion (Legacy: Notificacion)
Python

class Notificacion(models.Model):
    # En lugar de FK a User, usamos ID
    usuario_destinatario_id = models.BigIntegerField() 
    
    # Referencia a la cita (opcional)
    cita_id = models.BigIntegerField(null=True, blank=True)
    
    asunto = models.CharField(max_length=255)
    mensaje = models.TextField()
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Optimización: índice para buscar notificaciones de un usuario rápido
        indexes = [
            models.Index(fields=['usuario_destinatario_id', 'leida']),
        ]