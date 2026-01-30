from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CitaViewSet,
    ConfiguracionViewSet,
    HistoricoCitaViewSet,
    NotaMedicaViewSet,
)

router = DefaultRouter()
router.register(r"citas", CitaViewSet)
router.register(r"notas", NotaMedicaViewSet)
router.register(r"historico", HistoricoCitaViewSet)
router.register(r"citas/configuracion", ConfiguracionViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
