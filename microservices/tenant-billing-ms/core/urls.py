from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def home_view(_request):
    return JsonResponse(
        {
            "service": "tenant-billing-ms",
            "status": "active",
            "version": "0.1.0",
        }
    )


urlpatterns = [
    path("", home_view),
    path("admin/", admin.site.urls),
    path("api/v1/tenancy/", include("tenancy.urls")),
]
