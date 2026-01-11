from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PacienteViewSet, TipoPacienteViewSet

router = DefaultRouter()
router.register(r'listado', PacienteViewSet, basename='paciente')
router.register(r'tipos', TipoPacienteViewSet, basename='tipopaciente')

urlpatterns = [
    path('', include(router.urls)),
]