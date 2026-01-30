from rest_framework import serializers

from .models import Banner, VideoGaleria


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = "__all__"


class VideoGaleriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoGaleria
        fields = "__all__"
