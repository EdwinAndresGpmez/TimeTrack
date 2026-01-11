from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CrearCuenta, MenuItem
from .serializers import UserSerializer, CustomTokenObtainPairSerializer, MenuItemSerializer

# Vista de Registro
class RegisterView(generics.CreateAPIView):
    queryset = CrearCuenta.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

# Vista de Login Personalizada
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# Vista para obtener datos del usuario actual
class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = CrearCuenta.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

# Vista de Menú Dinámico
class DynamicMenuView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_groups = request.user.groups.all()
        # Filtrar items que no tienen rol asignado (públicos) o coinciden con grupos del usuario
        items = MenuItem.objects.filter(
            models.Q(roles__in=user_groups) | models.Q(roles__isnull=True)
        ).distinct().order_by('order')
        
        serializer = MenuItemSerializer(items, many=True)
        return Response(serializer.data)