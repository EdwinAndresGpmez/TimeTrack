from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CitaViewSet, NotaMedicaViewSet, HistoricoCitaViewSet, ConfiguracionViewSet, ReporteInasistenciasViewSet


router = DefaultRouter()
router.register(r'citas', CitaViewSet)
router.register(r'notas', NotaMedicaViewSet)
router.register(r'historico', HistoricoCitaViewSet)
router.register(r'citas/configuracion', ConfiguracionViewSet)

router.register(r'reportes/inasistencias', ReporteInasistenciasViewSet, basename='reporte-inasistencias')

urlpatterns = [
    path('', include(router.urls)),
    
]