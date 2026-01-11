from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin, Group

class CrearCuentaManager(BaseUserManager):
    def create_user(self, cedula, password=None, **extra_fields):
        if not cedula:
            raise ValueError('El número de documento (cédula) es obligatorio')
        user = self.model(cedula=cedula, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, cedula, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(cedula, password, **extra_fields)

class CrearCuenta(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=255, unique=True)
    nombre = models.CharField(max_length=255)
    correo = models.EmailField(max_length=255, unique=True)
    tipo_documento = models.CharField(max_length=20)
    cedula = models.CharField(max_length=255, unique=True, db_index=True) # USERNAME_FIELD
    numero = models.CharField(max_length=255)
    
    # --- REFERENCIAS A OTROS MICROSERVICIOS (IDs) ---
    # Indexamos estos campos porque se buscará mucho por ellos
    paciente_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    profesional_id = models.BigIntegerField(null=True, blank=True, db_index=True) # ¡FALTABA ESTE!
    
    acepta_tratamiento_datos = models.BooleanField(default=False)
    usuario_estado = models.BooleanField(default=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CrearCuentaManager()

    USERNAME_FIELD = 'cedula'
    REQUIRED_FIELDS = ['username', 'correo', 'nombre']

    # --- COMPATIBILIDAD ---
    @property
    def email(self):
        """Puente para que Django encuentre .email aunque el campo sea .correo"""
        return self.correo

    def __str__(self):
        return f"{self.nombre} - {self.cedula}"

# --- MODELOS DE SOPORTE Y CONFIGURACIÓN UI ---
# Estos modelos viven en Auth-MS porque controlan el acceso y la seguridad

class Auditoria(models.Model):
    descripcion = models.TextField() 
    usuario_id = models.BigIntegerField(null=True) # ID del usuario que hizo la acción
    fecha = models.DateTimeField(auto_now_add=True)
    modulo = models.CharField(max_length=100, default='GENERAL') 

class PermisoVista(models.Model):
    nombre_vista = models.CharField(max_length=255, unique=True)
    roles_permitidos = models.ManyToManyField(Group)

    def __str__(self):
        return self.nombre_vista

class MenuItem(models.Model):
    label = models.CharField(max_length=100)
    url = models.CharField(max_length=200)
    icon = models.CharField(max_length=100, blank=True, null=True)
    order = models.IntegerField(default=0)
    roles = models.ManyToManyField(Group, blank=True)
    
    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.label