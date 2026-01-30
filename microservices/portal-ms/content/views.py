from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Banner, VideoGaleria
from .serializers import BannerSerializer, VideoGaleriaSerializer


class BannerListView(generics.ListAPIView):
    """
    Retorna la lista de banners activos ordenados por prioridad.
    Público: Cualquiera puede verlos.
    """

    queryset = Banner.objects.filter(activo=True).order_by("orden", "-created_at")
    serializer_class = BannerSerializer
    permission_classes = [AllowAny]


class VideoListView(generics.ListAPIView):
    """
    Retorna la galería de videos activos.
    """

    queryset = VideoGaleria.objects.filter(activo=True).order_by("-id")
    serializer_class = VideoGaleriaSerializer
    permission_classes = [AllowAny]
