from django.db import models

class Especialidad(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = "Especialidad"
        verbose_name_plural = "Especialidades"

    def __str__(self):
        return self.nombre

class Lugar(models.Model):
    """Sedes o Consultorios"""
    nombre = models.CharField(max_length=255) # Ej: Sede Norte
    direccion = models.CharField(max_length=255)
    ciudad = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Lugar"
        verbose_name_plural = "Lugares"

    def __str__(self):
        return self.nombre

class Profesional(models.Model):
    nombre = models.CharField(max_length=255)
    numero_documento = models.CharField(max_length=50, unique=True)
    registro_medico = models.CharField(max_length=100, unique=True) # Tarjeta profesional
    
    email_profesional = models.EmailField(unique=True)
    telefono_profesional = models.CharField(max_length=50)

    # Relaciones
    especialidades = models.ManyToManyField(Especialidad)
    lugares_atencion = models.ManyToManyField(Lugar, related_name="profesionales")
    
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Profesional"
        verbose_name_plural = "Profesionales"

    def __str__(self):
        return self.nombre

class Servicio(models.Model):
    """Lo que se vende (Consultas, Procedimientos)"""
    nombre = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)
    
    # Datos críticos para Citas y Pagos
    duracion_minutos = models.IntegerField() 
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Filtro: Solo ciertos médicos hacen ciertos servicios
    profesionales = models.ManyToManyField(Profesional, related_name='servicios_habilitados')
    
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"

    def __str__(self):
        return self.nombre