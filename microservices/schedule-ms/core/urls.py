from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # IMPORTANTE: Aquí definimos el prefijo exacto que manda Nginx
    path("api/v1/agenda/", include("agenda.urls")),
]
