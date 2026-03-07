from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from content.views import (
    # Públicos
    BannerListView,
    VideoListView,
    ThemePublicView,
    PagePublicView,

    # Admin
    BannerAdminViewSet,
    VideoGaleriaAdminViewSet,
    ThemeAdminView,
    MediaAssetAdminViewSet,
    PageAdminViewSet,
    PageSectionAdminViewSet,
    HomeSectionsAdminView,
)

from forms.views import (
    HVCreateView,
    PQRSCreateView,
    PQRSAdminViewSet,
    ConvocatoriaHVAdminViewSet,
)

router = DefaultRouter()

# -------------------------
# ADMIN (CRUD)
# -------------------------
router.register(
    r"api/v1/portal/admin/banners",
    BannerAdminViewSet,
    basename="portal-admin-banners",
)
router.register(
    r"api/v1/portal/admin/videos",
    VideoGaleriaAdminViewSet,
    basename="portal-admin-videos",
)
router.register(
    r"api/v1/portal/admin/media",
    MediaAssetAdminViewSet,
    basename="portal-admin-media",
)
router.register(
    r"api/v1/portal/admin/pages",
    PageAdminViewSet,
    basename="portal-admin-pages",
)
router.register(
    r"api/v1/portal/admin/sections",
    PageSectionAdminViewSet,
    basename="portal-admin-sections",
)
router.register(
    r"api/v1/portal/admin/pqrs",
    PQRSAdminViewSet,
    basename="portal-admin-pqrs",
)
router.register(
    r"api/v1/portal/admin/convocatorias",
    ConvocatoriaHVAdminViewSet,
    basename="portal-admin-convocatorias",
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # -------------------------
    # PÚBLICO (GET)
    # -------------------------
    path("api/v1/portal/banners/", BannerListView.as_view(), name="banner-list"),
    path("api/v1/portal/videos/", VideoListView.as_view(), name="video-list"),
    path("api/v1/portal/theme/", ThemePublicView.as_view(), name="theme-public"),
    path("api/v1/portal/pages/<slug:slug>/", PagePublicView.as_view(), name="page-public"),
    

    # -------------------------
    # ADMIN THEME (singleton)
    # -------------------------
    path("api/v1/portal/admin/theme/", ThemeAdminView.as_view(), name="theme-admin"),
    path("api/v1/portal/admin/home/sections/", HomeSectionsAdminView.as_view(), name="admin-home-sections"),

    # -------------------------
    # ROUTER ADMIN (CRUD)
    # -------------------------
    path("", include(router.urls)),

    # -------------------------
    # FORMULARIOS (POST)
    # -------------------------
    path("api/v1/portal/pqrs/", PQRSCreateView.as_view(), name="pqrs-create"),
    path("api/v1/portal/trabaje-con-nosotros/", HVCreateView.as_view(), name="hv-create"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
