from django.db import models


class Banner(models.Model):
    titulo = models.CharField(max_length=200, blank=True)
    descripcion = models.TextField(blank=True)
    # Imagen para Desktop
    imagen_desktop = models.ImageField(upload_to="banners/", verbose_name="Imagen PC (1920x1080)")
    # Imagen para Móvil (Opcional pero recomendado para responsive)
    imagen_movil = models.ImageField(upload_to="banners/", blank=True, null=True, verbose_name="Imagen Móvil")

    link_accion = models.URLField(blank=True, null=True, help_text="Si el banner lleva a algún lado")
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["orden", "-created_at"]

    def __str__(self):
        return self.titulo or f"Banner {self.id}"


class VideoGaleria(models.Model):
    titulo = models.CharField(max_length=200)
    # Opción A: Archivo subido
    archivo_video = models.FileField(upload_to="videos/", blank=True, null=True)
    # Opción B: Link de YouTube/Vimeo (Más eficiente para no saturar tu servidor)
    url_externa = models.URLField(blank=True, null=True, help_text="Link de YouTube/Vimeo")

    portada = models.ImageField(upload_to="videos/thumbnails/", blank=True, null=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.titulo
