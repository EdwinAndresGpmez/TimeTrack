from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    DynamicMenuView,
    MisPermisosView,
    RegistroView,
    UserAdminViewSet,
    UserDetailView,
)

# Configuración del Router para el ViewSet de Admin
router = DefaultRouter()
router.register(r"admin/users", UserAdminViewSet, basename="admin_users")

urlpatterns = [
    # Rutas manuales existentes
    path("register/", RegistroView.as_view(), name="auth_register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("login/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", UserDetailView.as_view(), name="user_me"),
    path("menu/", DynamicMenuView.as_view(), name="dynamic_menu"),
    path("me/permisos/", MisPermisosView.as_view(), name="user_permissions"),
    # Rutas generadas por el Router (para gestión de usuarios)
    path("", include(router.urls)),
]
