from rest_framework import viewsets

from .models import Notificacion
from .serializers import NotificacionSerializer


class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer

    def get_queryset(self):
        """
        Filtrar por usuario si se pasa el parámetro ?usuario_id=X
        (En producción esto se toma del Token, por ahora por URL para migración)
        """
        queryset = super().get_queryset()
        usuario_id = self.request.query_params.get("usuario_id")
        if usuario_id:
            queryset = queryset.filter(usuario_id=usuario_id)
        return queryset
