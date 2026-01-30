from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import PQRS, ConvocatoriaHV
from .serializers import ConvocatoriaHVSerializer, PQRSSerializer


class PQRSCreateView(generics.CreateAPIView):
    """
    Permite a cualquier usuario radicar una PQRS.
    """

    queryset = PQRS.objects.all()
    serializer_class = PQRSSerializer
    permission_classes = [AllowAny]


class HVCreateView(generics.CreateAPIView):
    """
    Permite cargar una hoja de vida para vacantes (Trabaje con Nosotros).
    """

    queryset = ConvocatoriaHV.objects.all()
    serializer_class = ConvocatoriaHVSerializer
    permission_classes = [AllowAny]
