from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PacienteViewSet, 
    TipoPacienteViewSet, 
    SyncPacienteUserView, 
    SolicitudValidacionViewSet,
    BulkPacienteView 
)

# Configuración del Router
router = DefaultRouter()
router.register(r'listado', PacienteViewSet, basename='paciente')
router.register(r'tipos', TipoPacienteViewSet, basename='tipopaciente')
router.register(r'solicitudes', SolicitudValidacionViewSet, basename='solicitud')

urlpatterns = [
    path('internal/sync-user/', SyncPacienteUserView.as_view(), name='sync_user'),
    path('internal/bulk-info/', BulkPacienteView.as_view(), name='bulk_pacientes'),
    
    # --- RUTAS DEL ROUTER (Deben ir AL FINAL) ---
    path('', include(router.urls)),
]