from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DisponibilidadViewSet, BloqueoAgendaViewSet

router = DefaultRouter()
router.register(r'disponibilidad', DisponibilidadViewSet, basename='disponibilidad')
router.register(r'bloqueos', BloqueoAgendaViewSet, basename='bloqueo')

urlpatterns = [
    path('', include(router.urls)),
]