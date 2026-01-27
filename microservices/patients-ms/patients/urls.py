from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PacienteViewSet, 
    TipoPacienteViewSet, 
    SyncPacienteUserView, 
    SolicitudValidacionViewSet,
    BulkPacienteView # <--- Verificación 1: Importación correcta
)

# Configuración del Router
router = DefaultRouter()
router.register(r'listado', PacienteViewSet, basename='paciente')
router.register(r'tipos', TipoPacienteViewSet, basename='tipopaciente')
router.register(r'solicitudes', SolicitudValidacionViewSet, basename='solicitud')

urlpatterns = [
    # --- RUTAS MANUALES (Deben ir PRIMERO) ---
    
    # Esta es la ruta que está fallando (404). Al ponerla primero, Django la encontrará.
    path('internal/bulk-info/', BulkPacienteView.as_view(), name='bulk_pacientes'),
    
    path('internal/sync-user/', SyncPacienteUserView.as_view(), name='sync_user'),

    # --- RUTAS DEL ROUTER (Deben ir AL FINAL) ---
    path('', include(router.urls)),
]