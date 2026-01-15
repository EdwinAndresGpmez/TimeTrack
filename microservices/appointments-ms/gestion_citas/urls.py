from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CitaViewSet, NotaMedicaViewSet, HistoricoCitaViewSet, ConfiguracionViewSet


router = DefaultRouter()
router.register(r'citas', CitaViewSet)
router.register(r'notas', NotaMedicaViewSet)
router.register(r'historico', HistoricoCitaViewSet)
router.register(r'configuracion', ConfiguracionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]