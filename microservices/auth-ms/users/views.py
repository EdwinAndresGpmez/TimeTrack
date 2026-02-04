from django.contrib.auth.models import Group
from django.db import models
from django.db.models import Q
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

# --- VISTAS PÚBLICAS Y DE USUARIO ---

class RegistroView(generics.CreateAPIView):
    queryset = CrearCuenta.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # --- LÓGICA DE AUTOCURACIÓN (SELF-HEALING) ---
        documento = request.data.get('documento')
        # Obtenemos el valor del correo (puede venir como 'email' o 'correo' desde el front)
        email_val = request.data.get('email') or request.data.get('correo')

        if documento or email_val:
            # Buscamos usuarios inactivos que coincidan
            # CORRECCIÓN AQUÍ: Usamos 'correo=' porque así se llama en tu BD
            zombies = CrearCuenta.objects.filter(
                Q(documento=documento) | Q(correo=email_val), 
                is_active=False
            )
            
            if zombies.exists():
                count = zombies.count()
                zombies.delete() 
                print(f"♻️ [Auto-Healing] Se eliminaron {count} usuarios inactivos.")

        # --- FIN LÓGICA BLINDAJE ---

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(
                {"mensaje": "Usuario creado exitosamente", "usuario": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = CrearCuenta.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = serializer.save()
        # Auto-asignación de roles al vincular paciente (Onboarding)
        if user.paciente_id:
            try:
                grupo_paciente, _ = Group.objects.get_or_create(name="Paciente")
                if not user.groups.filter(name="Paciente").exists():
                    user.groups.add(grupo_paciente)
            except Exception as e:
                print(f"⚠️ Error asignando grupo Paciente: {e}")

        if user.profesional_id:
            try:
                grupo_prof, _ = Group.objects.get_or_create(name="Profesional")
                if not user.groups.filter(name="Profesional").exists():
                    user.groups.add(grupo_prof)
            except Exception:
                pass

# --- VISTAS DE MENÚ ---

class DynamicMenuView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_groups = request.user.groups.all()
        if request.user.is_superuser:
            items = MenuItem.objects.all().distinct().order_by("order")
        else:
            items = MenuItem.objects.filter(roles__in=user_groups).distinct().order_by("order")
        serializer = MenuItemSerializer(items, many=True)
        return Response(serializer.data)

class MisPermisosView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_groups = request.user.groups.all()
        lista_codenames = []
        if request.user.is_superuser:
            lista_codenames = list(PermisoVista.objects.values_list("codename", flat=True))
        else:
            lista_codenames = list(PermisoVista.objects.filter(roles__in=user_groups).values_list("codename", flat=True).distinct())
        
        lista_roles = list(user_groups.values_list("name", flat=True))
        return Response({
            "codenames": lista_codenames,
            "roles": lista_roles,
            "is_superuser": request.user.is_superuser,
            "is_staff": request.user.is_staff,
        })

# --- VISTAS ADMINISTRATIVAS ---

class UserAdminViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de usuarios SOLO para Administradores.
    Permite editar documento, is_active y asignar roles.
    """
    queryset = CrearCuenta.objects.all().order_by("-id")
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_authenticators(self):
        if self.request.method == "OPTIONS": return []
        return super().get_authenticators()

    def get_permissions(self):
        if self.request.method == "OPTIONS": return [AllowAny()]
        return super().get_permissions()

    # Lógica de asignación de roles manual por Admin
    def perform_update(self, serializer):
        user = serializer.save()
        if user.paciente_id:
            grp, _ = Group.objects.get_or_create(name="Paciente")
            if not user.groups.filter(name="Paciente").exists():
                user.groups.add(grp)
        
        if user.profesional_id:
            grp, _ = Group.objects.get_or_create(name="Profesional")
            if not user.groups.filter(name="Profesional").exists():
                user.groups.add(grp)

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