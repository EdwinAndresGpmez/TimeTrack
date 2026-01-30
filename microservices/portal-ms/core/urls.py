from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from content.views import BannerListView, VideoListView
from forms.views import HVCreateView, PQRSCreateView

urlpatterns = [
    path("admin/", admin.site.urls),
    # --- Rutas de Contenido (GET) ---
    path("api/v1/portal/banners/", BannerListView.as_view(), name="banner-list"),
    path("api/v1/portal/videos/", VideoListView.as_view(), name="video-list"),
    # --- Rutas de Formularios (POST) ---
    path("api/v1/portal/pqrs/", PQRSCreateView.as_view(), name="pqrs-create"),
    path("api/v1/portal/trabaje-con-nosotros/", HVCreateView.as_view(), name="hv-create"),
]

# Configuración para servir archivos multimedia (Imágenes/PDFs) en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
