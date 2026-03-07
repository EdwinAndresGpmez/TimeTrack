from django.db import models


# -------------------------
# MODELOS EXISTENTES
# -------------------------

class Banner(models.Model):
    titulo = models.CharField(max_length=200, blank=True)
    descripcion = models.TextField(blank=True)

    imagen_desktop = models.ImageField(upload_to="banners/", verbose_name="Imagen PC (1920x1080)")
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
    archivo_video = models.FileField(upload_to="videos/", blank=True, null=True)
    url_externa = models.URLField(blank=True, null=True, help_text="Link de YouTube/Vimeo")
    portada = models.ImageField(upload_to="videos/thumbnails/", blank=True, null=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.titulo


# -------------------------
# NUEVO: THEME / BRANDING
# -------------------------

class PortalTheme(models.Model):
    """
    Configuración de marca del portal (single-tenant por ahora).
    Si luego quieres multi-empresa, agregamos company_id / slug.
    """
    company_name = models.CharField(max_length=120, default="Mi Empresa")
    logo = models.ImageField(upload_to="branding/", blank=True, null=True)

    # Colores (HEX)
    primary_color = models.CharField(max_length=20, default="#2f7ecb")      # azul principal
    secondary_color = models.CharField(max_length=20, default="#0f172a")    # oscuro
    accent_color = models.CharField(max_length=20, default="#34d399")       # acento
    background_color = models.CharField(max_length=20, default="#ffffff")  # fondo
    surface_color = models.CharField(max_length=20, default="#efefef")     # secciones grises
    text_color = models.CharField(max_length=20, default="#0f172a")

    border_radius = models.IntegerField(default=12)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Theme: {self.company_name}"


# -------------------------
# NUEVO: MEDIA LIBRARY
# -------------------------

class MediaAsset(models.Model):
    TYPE_IMAGE = "image"
    TYPE_VIDEO = "video"
    TYPE_PDF = "pdf"

    TYPE_CHOICES = (
        (TYPE_IMAGE, "Image"),
        (TYPE_VIDEO, "Video"),
        (TYPE_PDF, "PDF"),
    )

    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_IMAGE)
    file = models.FileField(upload_to="assets/")
    title = models.CharField(max_length=200, blank=True)
    alt_text = models.CharField(max_length=200, blank=True)
    # tags simples para buscar (["hero","servicios"])
    tags = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title or f"Asset {self.id} ({self.type})"


# -------------------------
# NUEVO: PAGES + SECTIONS (CMS)
# -------------------------

class Page(models.Model):
    """
    Ej: slug="home"
    """
    slug = models.SlugField(max_length=80, unique=True)
    title = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.slug


class PageSection(models.Model):
    """
    Secciones ordenables y activables con JSON editable.
    data puede incluir ids de MediaAsset o incluso URLs directas.
    """
    TYPE_HERO = "hero"
    TYPE_FEATURES = "features"
    TYPE_SERVICES = "services"
    TYPE_HOW_WE_WORK = "how_we_work"
    TYPE_THREE_COLS = "three_cols"
    TYPE_VALUES = "values"
    TYPE_TEAM = "team"
    TYPE_TESTIMONIALS = "testimonials"
    TYPE_VIDEOS = "videos"
    TYPE_CONTACT = "contact"
    TYPE_CUSTOM = "custom"  # sección libre (para agregar lo que la empresa quiera)

    TYPE_CHOICES = (
        (TYPE_HERO, "Hero"),
        (TYPE_FEATURES, "Features Strip"),
        (TYPE_SERVICES, "Services"),
        (TYPE_HOW_WE_WORK, "How We Work"),
        (TYPE_THREE_COLS, "Three Columns"),
        (TYPE_VALUES, "Values"),
        (TYPE_TEAM, "Team"),
        (TYPE_TESTIMONIALS, "Testimonials"),
        (TYPE_VIDEOS, "Video Gallery"),
        (TYPE_CONTACT, "Contact"),
        (TYPE_CUSTOM, "Custom"),
    )

    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="sections")
    type = models.CharField(max_length=40, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200, blank=True)

    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    # Aquí vive TODO lo editable:
    # textos, botones, configuración, items, ids de media assets, etc.
    data = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.page.slug}::{self.type}#{self.id}"
