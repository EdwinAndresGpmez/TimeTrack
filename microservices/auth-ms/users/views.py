from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import models
from .models import CrearCuenta, MenuItem, PermisoVista
from .serializers import (
    UserSerializer,
    CustomTokenObtainPairSerializer,
    MenuItemSerializer,
    UserAdminSerializer,
)
from rest_framework.decorators import action
from django.contrib.auth.models import Group


# Vista de Registro
class RegistroView(generics.CreateAPIView):
    queryset = CrearCuenta.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]  # Permite registrarse sin estar logueado

    def create(self, request, *args, **kwargs):
        # Usamos el UserSerializer que ya tienes definido
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(
                {"mensaje": "Usuario creado exitosamente", "usuario": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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
        items = (
            MenuItem.objects.filter(
                models.Q(roles__in=user_groups) | models.Q(roles__isnull=True)
            )
            .distinct()
            .order_by("order")
        )

        serializer = MenuItemSerializer(items, many=True)
        return Response(serializer.data)


class MisPermisosView(APIView):
    """
    Devuelve:
    1. 'codenames': Lista de vistas para el menú dinámico.
    2. 'roles': Lista de grupos para proteger rutas (ProtectedRoute).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 1. Obtenemos los grupos del usuario
        user_groups = request.user.groups.all()

        # --- LÓGICA DE VISTAS (Tu código original intacto) ---
        lista_codenames = []

        if request.user.is_superuser:
            # Si es Superusuario, tiene acceso a TODO
            lista_codenames = list(
                PermisoVista.objects.values_list("codename", flat=True)
            )
        else:
            # Filtramos las vistas donde sus roles estén permitidos
            lista_codenames = list(
                PermisoVista.objects.filter(roles__in=user_groups)
                .values_list("codename", flat=True)
                .distinct()
            )

        # --- NUEVA LÓGICA (Roles para el Frontend) ---
        # Extraemos los nombres de los grupos (ej: ['admin', 'paciente'])
        lista_roles = list(user_groups.values_list("name", flat=True))

        # --- RESPUESTA COMBINADA ---
        # Devolvemos un objeto con ambas listas
        return Response(
            {
                "codenames": lista_codenames,  # Para pintar el menú
                "roles": lista_roles,  # Para validar rutas (AdminUsuarios)
                "is_superuser": request.user.is_superuser,
                "is_staff": request.user.is_staff,
            }
        )


class UserAdminViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de usuarios SOLO para Administradores.
    """

    queryset = CrearCuenta.objects.all().order_by("-id")
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    # 🔑 FIX DEFINITIVO CORS / PREFLIGHT
    def get_authenticators(self):
        if self.request.method == "OPTIONS":
            return []
        return super().get_authenticators()

    def get_permissions(self):
        if self.request.method == "OPTIONS":
            return [AllowAny()]
        return super().get_permissions()

    # Endpoint extra para cambiar contraseña manualmente
    @action(detail=True, methods=["post"])
    def change_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get("password")

        if not password:
            return Response(
                {"error": "Contraseña requerida"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(password)
        user.save()
        return Response({"status": "Contraseña actualizada correctamente"})

    # Endpoint para obtener lista de grupos disponibles
    @action(detail=False, methods=["get"])
    def groups(self, request):
        grupos = Group.objects.values_list("name", flat=True)
        return Response(grupos)
