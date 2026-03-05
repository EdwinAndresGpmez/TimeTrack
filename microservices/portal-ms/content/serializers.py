from rest_framework import serializers

from .models import (
    Banner,
    VideoGaleria,
    PortalTheme,
    MediaAsset,
    Page,
    PageSection,
)


class BannerSerializer(serializers.ModelSerializer):
    imagen_desktop_url = serializers.SerializerMethodField()
    imagen_movil_url = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = [
            "id",
            "titulo",
            "descripcion",
            "link_accion",
            "orden",
            "activo",
            "imagen_desktop",
            "imagen_movil",
            "imagen_desktop_url",
            "imagen_movil_url",
            "created_at",
        ]

    def _abs(self, request, url):
        if not url:
            return None
        return request.build_absolute_uri(url) if request else url

    def get_imagen_desktop_url(self, obj):
        request = self.context.get("request")
        try:
            return self._abs(request, obj.imagen_desktop.url)
        except Exception:
            return None

    def get_imagen_movil_url(self, obj):
        request = self.context.get("request")
        try:
            return self._abs(request, obj.imagen_movil.url)
        except Exception:
            return None


class VideoGaleriaSerializer(serializers.ModelSerializer):
    archivo_video_url = serializers.SerializerMethodField()
    portada_url = serializers.SerializerMethodField()

    class Meta:
        model = VideoGaleria
        fields = [
            "id",
            "titulo",
            "archivo_video",
            "url_externa",
            "portada",
            "archivo_video_url",
            "portada_url",
            "activo",
        ]

    def _abs(self, request, url):
        if not url:
            return None
        return request.build_absolute_uri(url) if request else url

    def get_archivo_video_url(self, obj):
        request = self.context.get("request")
        try:
            return self._abs(request, obj.archivo_video.url)
        except Exception:
            return None

    def get_portada_url(self, obj):
        request = self.context.get("request")
        try:
            return self._abs(request, obj.portada.url)
        except Exception:
            return None


class PortalThemeSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = PortalTheme
        fields = [
            "id",
            "company_name",
            "logo",
            "logo_url",
            "primary_color",
            "secondary_color",
            "accent_color",
            "background_color",
            "surface_color",
            "text_color",
            "border_radius",
            "updated_at",
        ]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        try:
            url = obj.logo.url if obj.logo else None
        except Exception:
            url = None
        if not url:
            return None
        return request.build_absolute_uri(url) if request else url


class MediaAssetSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = [
            "id",
            "type",
            "file",
            "file_url",
            "title",
            "alt_text",
            "tags",
            "created_at",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        try:
            url = obj.file.url
        except Exception:
            url = None
        if not url:
            return None
        return request.build_absolute_uri(url) if request else url


class PageSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageSection
        fields = [
            "id",
            "page",
            "type",
            "title",
            "order",
            "is_active",
            "data",
            "created_at",
            "updated_at",
        ]


class PageSerializer(serializers.ModelSerializer):
    sections = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = ["id", "slug", "title", "sections"]

    def get_sections(self, obj):
        # por defecto devolvemos secciones activas ordenadas
        request = self.context.get("request")
        qs = obj.sections.filter(is_active=True).order_by("order", "id")
        return PageSectionSerializer(qs, many=True, context={"request": request}).data