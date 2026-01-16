from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PacienteViewSet, 
    TipoPacienteViewSet, 
    SyncPacienteUserView, 
    SolicitudValidacionViewSet # <--- Importante
)

# Configuración del Router
router = DefaultRouter()
router.register(r'listado', PacienteViewSet, basename='paciente')
router.register(r'tipos', TipoPacienteViewSet, basename='tipopaciente')

# Registramos la ruta para el Admin
router.register(r'solicitudes', SolicitudValidacionViewSet, basename='solicitud')

urlpatterns = [
    # 1. Rutas Manuales (Endpoint interno de sincronización)
    path('internal/sync-user/', SyncPacienteUserView.as_view(), name='sync_user'),

    # 2. Rutas generadas por el Router (CRUDs automáticos)
    path('', include(router.urls)),
]