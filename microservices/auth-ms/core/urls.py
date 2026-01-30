"""
URL configuration for core project.
"""

from django.contrib import admin
from django.urls import path, include  # <--- IMPORTANTE: AGREGAR INCLUDE
from rest_framework_simplejwt.views import TokenRefreshView

# 1. Agregamos MisPermisosView a los imports
from users.views import (
    RegistroView,
    CustomTokenObtainPairView,
    UserDetailView,
    DynamicMenuView,
    MisPermisosView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # Rutas manuales (Auth)
    path(
        "api/v1/auth/login/",
        CustomTokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path("api/v1/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/register/", RegistroView.as_view(), name="auth_register"),
    path("api/v1/auth/me/", UserDetailView.as_view(), name="user_me"),
    path("api/v1/auth/menu/", DynamicMenuView.as_view(), name="dynamic_menu"),
    path(
        "api/v1/auth/me/permisos/", MisPermisosView.as_view(), name="user_permissions"
    ),
    path("api/v1/users/", include("users.urls")),
]
