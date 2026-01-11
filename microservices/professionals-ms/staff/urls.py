from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EspecialidadViewSet, 
    LugarViewSet, 
    ProfesionalViewSet, 
    ServicioViewSet
)

router = DefaultRouter()
router.register(r'especialidades', EspecialidadViewSet, basename='especialidad')
router.register(r'lugares', LugarViewSet, basename='lugar')
router.register(r'profesionales', ProfesionalViewSet, basename='profesional')
router.register(r'servicios', ServicioViewSet, basename='servicio')

urlpatterns = [
    path('', include(router.urls)),
]