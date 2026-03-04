from rest_framework import serializers
from .models import Banner, VideoGaleria

class BannerSerializer(serializers.ModelSerializer):
    imagen_desktop_url = serializers.SerializerMethodField()
    imagen_movil_url = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = "__all__"

    def get_imagen_desktop_url(self, obj):
        request = self.context.get("request")
        if obj.imagen_desktop and request:
            return request.build_absolute_uri(obj.imagen_desktop.url)
        return None

    def get_imagen_movil_url(self, obj):
        request = self.context.get("request")
        if obj.imagen_movil and request:
            return request.build_absolute_uri(obj.imagen_movil.url)
        return None


class VideoGaleriaSerializer(serializers.ModelSerializer):
    archivo_video_url = serializers.SerializerMethodField()
    portada_url = serializers.SerializerMethodField()

    class Meta:
        model = VideoGaleria
        fields = "__all__"

    def get_archivo_video_url(self, obj):
        request = self.context.get("request")
        if obj.archivo_video and request:
            return request.build_absolute_uri(obj.archivo_video.url)
        return None

    def get_portada_url(self, obj):
        request = self.context.get("request")
        if obj.portada and request:
            return request.build_absolute_uri(obj.portada.url)
        return None