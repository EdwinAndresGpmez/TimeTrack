from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChannelProviderConfigViewSet,
    NotificationDispatchView,
    NotificationTemplateViewSet,
    NotificacionViewSet,
)

router = DefaultRouter()
router.register(r"buzon", NotificacionViewSet, basename="notificacion")
router.register(r"channel-configs", ChannelProviderConfigViewSet, basename="channel-config")
router.register(r"templates", NotificationTemplateViewSet, basename="notification-template")

urlpatterns = [
    path("dispatch/", NotificationDispatchView.as_view(), name="notification-dispatch"),
    path("", include(router.urls)),
]
