from django.contrib.auth.models import Group
from django.db import models
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CrearCuenta, MenuItem, PermisoVista
from .serializers import (
    CustomTokenObtainPairSerializer,
    MenuItemSerializer,
    UserAdminSerializer,
    UserSerializer,
)


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

    # --- CORRECCIÓN CRÍTICA: Asignación de Rol Inmediata ---
    def perform_update(self, serializer):
        """
        Al actualizar el usuario (ej: desde PatientOnboarding),
        si se asigna un paciente_id, forzamos la asignación del Grupo.
        """
        user = serializer.save()

        # 1. Lógica para Pacientes (Onboarding Particular)
        if user.paciente_id:
            try:
                # Usamos get_or_create para que no falle si no existe
                grupo_paciente, created = Group.objects.get_or_create(name="Paciente")
                
                # Si el usuario no tiene el grupo, se lo ponemos
                if not user.groups.filter(name="Paciente").exists():
                    user.groups.add(grupo_paciente)
                    print(f"✅ [Vista] Usuario {user.documento} asignado al grupo 'Paciente' exitosamente.")
            except Exception as e:
                print(f"⚠️ [Vista] Error asignando grupo Paciente: {e}")

        # 2. Lógica para Profesionales (Futuro)
        if user.profesional_id:
            try:
                grupo_prof, _ = Group.objects.get_or_create(name="Profesional")
                if not user.groups.filter(name="Profesional").exists():
                    user.groups.add(grupo_prof)
            except Exception:
                pass


# Vista de Menú Dinámico
class DynamicMenuView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_groups = request.user.groups.all()
        
        if request.user.is_superuser:
            items = MenuItem.objects.all().distinct().order_by("order")
        else:
            items = (
                MenuItem.objects.filter(roles__in=user_groups)
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
        user_groups = request.user.groups.all()

        lista_codenames = []

        if request.user.is_superuser:
            lista_codenames = list(PermisoVista.objects.values_list("codename", flat=True))
        else:
            lista_codenames = list(
                PermisoVista.objects.filter(roles__in=user_groups).values_list("codename", flat=True).distinct()
            )

        lista_roles = list(user_groups.values_list("name", flat=True))

        return Response(
            {
                "codenames": lista_codenames,
                "roles": lista_roles,
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

    def get_authenticators(self):
        if self.request.method == "OPTIONS":
            return []
        return super().get_authenticators()

    def get_permissions(self):
        if self.request.method == "OPTIONS":
            return [AllowAny()]
        return super().get_permissions()

    # --- TAMBIÉN APLICAMOS LA CORRECCIÓN AQUÍ ---
    # Si un Admin vincula manualmente un paciente_id, el usuario debe recibir el rol.
    def perform_update(self, serializer):
        user = serializer.save()

        if user.paciente_id:
            grupo_paciente, _ = Group.objects.get_or_create(name="Paciente")
            if not user.groups.filter(name="Paciente").exists():
                user.groups.add(grupo_paciente)
        
        if user.profesional_id:
            grupo_prof, _ = Group.objects.get_or_create(name="Profesional")
            if not user.groups.filter(name="Profesional").exists():
                user.groups.add(grupo_prof)

    @action(detail=True, methods=["post"])
    def change_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get("password")

        if not password:
            return Response({"error": "Contraseña requerida"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()
        return Response({"status": "Contraseña actualizada correctamente"})

    @action(detail=False, methods=["get"])
    def groups(self, request):
        grupos = Group.objects.values_list("name", flat=True)
        return Response(grupos)