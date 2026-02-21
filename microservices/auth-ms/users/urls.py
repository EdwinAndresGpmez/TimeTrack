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
    MenuItemAdminViewSet,
    PermisoVistaAdminViewSet,
    GroupViewSet,
    SidebarBrandingView,
    MiRedFamiliarView
)

# Configuración del Router para el ViewSet de Admin
router = DefaultRouter()
router.register(r"admin/users", UserAdminViewSet, basename="admin_users")
router.register(r"admin/menu-items", MenuItemAdminViewSet, basename="admin_menu_items")
router.register(r"admin/permisos-vista", PermisoVistaAdminViewSet, basename="admin_permisos_vista")
router.register(r"admin/groups", GroupViewSet, basename="admin_groups")

urlpatterns = [
    # Rutas manuales existentes
    path("register/", RegistroView.as_view(), name="auth_register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("login/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", UserDetailView.as_view(), name="user_me"),
    path("me/red/", MiRedFamiliarView.as_view(), name="user_family_network"),
    path("menu/", DynamicMenuView.as_view(), name="dynamic_menu"),
    path("me/permisos/", MisPermisosView.as_view(), name="user_permissions"),
    path("admin/branding/", SidebarBrandingView.as_view(), name="admin_branding"),
    # Rutas generadas por el Router (para gestión de usuarios)
    path("", include(router.urls)),
]
