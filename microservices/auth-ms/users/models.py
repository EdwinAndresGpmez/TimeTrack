from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    Group,
    PermissionsMixin,
)
from django.db import models


class CrearCuentaManager(BaseUserManager):
    # Cambiamos 'cedula' por 'documento'
    def create_user(self, documento, password=None, **extra_fields):
        if not documento:
            raise ValueError("El número de documento es obligatorio")
        # Normalizamos la llamada al modelo
        user = self.model(documento=documento, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, documento, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(documento, password, **extra_fields)


class CrearCuenta(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=255, unique=True)
    nombre = models.CharField(max_length=255)
    correo = models.EmailField(max_length=255, unique=True)

    # Tipo de documento (CC, TI, PASAPORTE, DNI, ETC)
    tipo_documento = models.CharField(max_length=20)

    # Este será el identificador único del usuario en el sistema
    documento = models.CharField(max_length=255, unique=True, db_index=True)

    numero = models.CharField(max_length=255)

    # --- REFERENCIAS A OTROS MICROSERVICIOS (IDs) ---
    paciente_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    profesional_id = models.BigIntegerField(null=True, blank=True, db_index=True)

    acepta_tratamiento_datos = models.BooleanField(default=False)
    usuario_estado = models.BooleanField(default=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CrearCuentaManager()

    # Actualizamos el campo que Django usa para el login
    USERNAME_FIELD = "documento"
    REQUIRED_FIELDS = ["username", "correo", "nombre"]

    @property
    def email(self):
        return self.correo

    def __str__(self):
        return f"{self.nombre} - {self.documento}"


class Auditoria(models.Model):
    descripcion = models.TextField()
    usuario_id = models.BigIntegerField(null=True)  # ID del usuario que hizo la acción
    fecha = models.DateTimeField(auto_now_add=True)
    modulo = models.CharField(max_length=100, default="GENERAL")


class PermisoVista(models.Model):
    """
    Define qué Roles (Groups) pueden acceder a rutas específicas del Frontend.
    Ejemplo: codename='admin_panel' -> Solo roles 'Administrador'
    """

    codename = models.CharField(
        max_length=100,
        unique=True,
        help_text="ID único de la ruta en React (ej: '/dashboard/admin')",
    )
    descripcion = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Descripción legible (ej: Pantalla de Validación de Usuarios)",
    )
    roles = models.ManyToManyField(Group, related_name="vistas_permitidas", blank=True)

    def __str__(self):
        return f"{self.codename} - {self.descripcion or ''}"


class MenuItem(models.Model):
    label = models.CharField(max_length=100)
    url = models.CharField(max_length=200)
    icon = models.CharField(max_length=100, blank=True, null=True)
    order = models.IntegerField(default=0)
    roles = models.ManyToManyField(Group, blank=True)
    category_name = models.CharField(max_length=100, blank=True, null=True, help_text="Ej: GESTIÓN, REPORTES")
    is_active_item = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.category_name or 'Sin Cat'} - {self.label}"

class SidebarBranding(models.Model):
    empresa_nombre = models.CharField(max_length=100, default="TimeTrack")
    # CAMBIO: De URLField a TextField para soportar Base64
    logo_url = models.TextField(blank=True, null=True) 
    bg_color = models.CharField(max_length=20, default="#0f172a")
    accent_color = models.CharField(max_length=20, default="#34d399")
    variant = models.CharField(max_length=20, default="floating")
    border_radius = models.IntegerField(default=24)

    def __str__(self): # Corregido de __clon__ a __str__
        return self.empresa_nombre