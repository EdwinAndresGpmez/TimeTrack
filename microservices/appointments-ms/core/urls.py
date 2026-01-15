from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Prefijo api/v1 para mantener orden
    path('api/v1/', include('gestion_citas.urls')),
]