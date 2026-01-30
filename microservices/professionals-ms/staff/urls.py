from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EspecialidadViewSet,
    LugarViewSet,
    ProfesionalViewSet,
    ServicioViewSet,
    BulkProfesionalView,
    BulkServicioView,
    BulkLugarView,
)

router = DefaultRouter()
router.register(r"especialidades", EspecialidadViewSet, basename="especialidad")
router.register(r"lugares", LugarViewSet, basename="lugar")
router.register(r"profesionales", ProfesionalViewSet, basename="profesional")
router.register(r"servicios", ServicioViewSet, basename="servicio")

urlpatterns = [
    path(
        "internal/bulk-info/", BulkProfesionalView.as_view(), name="bulk_profesionales"
    ),
    path(
        "servicios/internal/bulk-info/",
        BulkServicioView.as_view(),
        name="bulk_servicios",
    ),
    path("lugares/internal/bulk-info/", BulkLugarView.as_view(), name="bulk_lugares"),
    path("", include(router.urls)),
]
