import hmac
import requests
from django.contrib.auth.models import Group
from django.db.models import Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CrearCuenta, GuideContent, MenuItem, PermisoVista, SidebarBranding, Auditoria, TenantMembership, TipoDocumento
from .serializers import (
    CustomTokenObtainPairSerializer,
    MenuItemSerializer,
    UserAdminSerializer,
    UserSerializer,
    MenuItemAdminSerializer,
    PermisoVistaAdminSerializer,
    GroupSerializer,
    SidebarBrandingSerializer,
    TenantMembershipSerializer,
    AuditoriaSerializer,
    GuideContentSerializer,
    TipoDocumentoSerializer,
)
from django.utils import timezone
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters


# --- VISTAS PÚBLICAS Y DE USUARIO ---


class RegistroView(generics.CreateAPIView):
    queryset = CrearCuenta.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # --- LÓGICA DE AUTOCURACIÓN (SELF-HEALING) ---
        documento = request.data.get("documento")
        # Obtenemos el valor del correo (puede venir como 'email' o 'correo' desde el front)
        email_val = request.data.get("email") or request.data.get("correo")

        if documento or email_val:
            # Buscamos usuarios inactivos que coincidan
            # CORRECCIÓN AQUÍ: Usamos 'correo=' porque así se llama en tu BD
            zombies = CrearCuenta.objects.filter(Q(documento=documento) | Q(correo=email_val), is_active=False)

            if zombies.exists():
                count = zombies.count()
                zombies.delete()
                print(f"♻️ [Auto-Healing] Se eliminaron {count} usuarios inactivos.")

        # --- FIN LÓGICA BLINDAJE ---

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            user = serializer.instance
            tenant_id_raw = request.data.get("tenant_id")
            if tenant_id_raw not in (None, ""):
                try:
                    tenant_id = int(tenant_id_raw)
                    # Usuario admin de tenant: staff + grupo base Administrador.
                    admin_group, _ = Group.objects.get_or_create(name="Administrador")
                    user.is_staff = True
                    user.tenant_id = tenant_id
                    user.save(update_fields=["is_staff", "tenant_id"])
                    user.groups.add(admin_group)

                    if not TenantMembership.objects.filter(
                        user=user,
                        tenant_id=tenant_id,
                        role_name="Administrador",
                    ).exists():
                        TenantMembership.objects.create(
                            user=user,
                            tenant_id=tenant_id,
                            tenant_slug=(request.data.get("tenant_slug") or "").strip() or None,
                            role_name="Administrador",
                            is_active=True,
                            is_default=True,
                        )
                except (TypeError, ValueError):
                    pass

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
        tenant_id = request.headers.get("X-Tenant-ID")
        if not tenant_id and getattr(request, "auth", None):
            tenant_id = request.auth.get("tenant_id")

        tenant_roles = []
        if tenant_id not in (None, ""):
            try:
                tenant_id_int = int(tenant_id)
                tenant_roles = list(
                    TenantMembership.objects.filter(
                        user=request.user,
                        tenant_id=tenant_id_int,
                        is_active=True,
                    ).values_list("role_name", flat=True)
                )
            except (TypeError, ValueError):
                tenant_roles = []

        if tenant_roles:
            user_groups = Group.objects.filter(
                Q(name__in=tenant_roles) | Q(id__in=request.user.groups.values_list("id", flat=True))
            ).distinct()
        else:
            user_groups = request.user.groups.all()

        feature_rules = _get_tenant_policy(request)

        # Filtramos para que solo traiga los que tienen is_active_item=True
        queryset = MenuItem.objects.filter(is_active_item=True) 

        if request.user.is_superuser:
            items = queryset.distinct().order_by("order")
        else:
            items = queryset.filter(roles__in=user_groups).distinct().order_by("order")
            
        filtered_items = []
        for item in items:
            if not _is_saas_superadmin_user(request):
                feature_code = MENU_FEATURE_MAP.get(item.url)
                if feature_code and not _is_feature_enabled(feature_rules, feature_code):
                    continue
            filtered_items.append(item)

        serializer = MenuItemSerializer(filtered_items, many=True)
        return Response(serializer.data)


class MisPermisosView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        feature_rules = _get_tenant_policy(request)
        tenant_id = request.headers.get("X-Tenant-ID")
        if not tenant_id and getattr(request, "auth", None):
            tenant_id = request.auth.get("tenant_id")

        tenant_roles = []
        if tenant_id not in (None, ""):
            try:
                tenant_id_int = int(tenant_id)
                tenant_roles = list(
                    TenantMembership.objects.filter(
                        user=request.user,
                        tenant_id=tenant_id_int,
                        is_active=True,
                    ).values_list("role_name", flat=True)
                )
            except (TypeError, ValueError):
                tenant_roles = []

        if tenant_roles:
            user_groups = Group.objects.filter(
                Q(name__in=tenant_roles) | Q(id__in=request.user.groups.values_list("id", flat=True))
            ).distinct()
        else:
            user_groups = request.user.groups.all()
        lista_codenames = []
        if request.user.is_superuser:
            lista_codenames = list(PermisoVista.objects.values_list("codename", flat=True))
        else:
            lista_codenames = list(
                PermisoVista.objects.filter(roles__in=user_groups).values_list("codename", flat=True).distinct()
            )

        if not _is_saas_superadmin_user(request):
            lista_codenames = [
                code
                for code in lista_codenames
                if _is_feature_enabled(feature_rules, PERMISSION_FEATURE_MAP.get(code))
            ]

        lista_roles = list(user_groups.values_list("name", flat=True))
        return Response(
            {
                "codenames": lista_codenames,
                "roles": lista_roles if not tenant_roles else tenant_roles,
                "is_superuser": request.user.is_superuser,
                "is_staff": request.user.is_staff,
            }
        )


class MisTenantsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        memberships = TenantMembership.objects.filter(user=request.user, is_active=True).order_by("tenant_id", "role_name")
        serializer = TenantMembershipSerializer(memberships, many=True)
        return Response(serializer.data)


class SwitchTenantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        tenant_id_raw = request.data.get("tenant_id")
        if tenant_id_raw in (None, ""):
            return Response({"detail": "tenant_id requerido"}, status=400)

        try:
            tenant_id = int(tenant_id_raw)
        except (TypeError, ValueError):
            return Response({"detail": "tenant_id invalido"}, status=400)

        roles = list(
            TenantMembership.objects.filter(
                user=request.user,
                tenant_id=tenant_id,
                is_active=True,
            ).values_list("role_name", flat=True).distinct()
        )
        membership = (
            TenantMembership.objects.filter(user=request.user, tenant_id=tenant_id, is_active=True)
            .order_by("-is_default", "id")
            .first()
        )
        tenant_slug = getattr(membership, "tenant_slug", None) or (request.data.get("tenant_slug") or None)

        global_roles = list(request.user.groups.values_list("name", flat=True))
        is_global_saas_superadmin = request.user.is_superuser or ("SuperAdmin SaaS" in global_roles)

        if not roles and not is_global_saas_superadmin:
            return Response({"detail": "El usuario no pertenece a ese tenant"}, status=403)

        # Si es superadmin global y no tiene rol local en el tenant, conserva rol global.
        if not roles and is_global_saas_superadmin:
            roles = [r for r in global_roles if r == "SuperAdmin SaaS"] or global_roles

        # Mantener un unico default por usuario.
        TenantMembership.objects.filter(user=request.user).update(is_default=False)
        TenantMembership.objects.filter(user=request.user, tenant_id=tenant_id, is_active=True).update(is_default=True)

        refresh = RefreshToken.for_user(request.user)
        refresh["documento"] = request.user.documento
        refresh["nombre"] = request.user.nombre
        refresh["apellidos"] = request.user.apellidos or ""
        refresh["nombre_completo"] = request.user.nombre_completo
        refresh["email"] = request.user.correo
        refresh["is_staff"] = request.user.is_staff
        refresh["paciente_id"] = request.user.paciente_id
        refresh["profesional_id"] = request.user.profesional_id
        refresh["tenant_id"] = tenant_id
        refresh["tenant_slug"] = tenant_slug
        refresh["roles"] = roles

        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "tenant_id": tenant_id,
                "tenant_slug": tenant_slug,
                "roles": roles,
            }
        )


class TiposDocumentoPublicView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = TipoDocumento.objects.filter(activo=True).order_by("orden", "nombre")
        serializer = TipoDocumentoSerializer(queryset, many=True)
        return Response(serializer.data)


class GuideContentPublicView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = GuideContent.objects.filter(is_active=True).order_by("key")
        key = request.query_params.get("key")
        if key:
            queryset = queryset.filter(key=key)
        serializer = GuideContentSerializer(queryset, many=True)
        return Response(serializer.data)


# --- VISTAS ADMINISTRATIVAS ---


class UserAdminViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de usuarios SOLO para Administradores.
    Permite editar documento, is_active y asignar roles.
    """

    queryset = CrearCuenta.objects.all().order_by("-id")
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def _sync_memberships_for_tenant(self, user, tenant_id, role_names):
        if tenant_id is None:
            return
        clean_roles = [r for r in (role_names or []) if r]
        if not clean_roles:
            return

        tenant_slug = None
        if getattr(self.request, "auth", None):
            tenant_slug = self.request.auth.get("tenant_slug")

        for role_name in clean_roles:
            TenantMembership.objects.get_or_create(
                user=user,
                tenant_id=tenant_id,
                role_name=role_name,
                defaults={
                    "tenant_slug": tenant_slug,
                    "is_active": True,
                    "is_default": False,
                },
            )

    def get_queryset(self):
        qs = CrearCuenta.objects.all().order_by("-id")

        tenant_id = _active_tenant_id_from_request(self.request)

        if self.request.user.is_superuser:
            if self.request.query_params.get("all_tenants") == "1":
                return qs
            if tenant_id is None:
                return qs
            member_user_ids = TenantMembership.objects.filter(
                tenant_id=tenant_id,
                is_active=True,
            ).values_list("user_id", flat=True)
            return qs.filter(Q(id__in=member_user_ids) | Q(tenant_id=tenant_id)).distinct().order_by("-id")

        if tenant_id is None:
            return qs.filter(id=self.request.user.id)

        member_user_ids = TenantMembership.objects.filter(
            tenant_id=tenant_id,
            is_active=True,
        ).values_list("user_id", flat=True)

        return qs.filter(Q(id__in=member_user_ids) | Q(tenant_id=tenant_id)).distinct().order_by("-id")

    def get_authenticators(self):
        if self.request.method == "OPTIONS":
            return []
        return super().get_authenticators()

    def get_permissions(self):
        if self.request.method == "OPTIONS":
            return [AllowAny()]
        return super().get_permissions()

    def perform_create(self, serializer):
        if self.request.user.is_superuser:
            tenant_id = _active_tenant_id_from_request(self.request)
            requested_tenant = serializer.validated_data.get("tenant_id")
            target_tenant = requested_tenant if requested_tenant not in (None, "") else tenant_id

            if target_tenant is None:
                user = serializer.save()
            else:
                user = serializer.save(tenant_id=target_tenant)

            requested_groups = serializer.validated_data.get("groups") or []
            role_names = [getattr(g, "name", "") for g in requested_groups]
            self._sync_memberships_for_tenant(user, target_tenant, role_names)
            return

        tenant_id = _active_tenant_id_from_request(self.request)
        if tenant_id is None:
            raise ValidationError({"detail": "Contexto tenant requerido para crear usuarios."})

        requested_tenant = serializer.validated_data.get("tenant_id")
        if requested_tenant not in (None, tenant_id):
            raise ValidationError({"tenant_id": "No puedes crear usuarios en otro tenant."})

        requested_groups = serializer.validated_data.get("groups")
        if requested_groups and any(getattr(g, "name", "") == "SuperAdmin SaaS" for g in requested_groups):
            raise ValidationError({"groups": "No autorizado para asignar SuperAdmin SaaS."})

        user = serializer.save(tenant_id=tenant_id)
        role_names = [getattr(g, "name", "") for g in (requested_groups or [])]
        self._sync_memberships_for_tenant(user, tenant_id, role_names)

    # Lógica de asignación de roles manual por Admin
    def perform_update(self, serializer):
        if not self.request.user.is_superuser:
            tenant_id = _active_tenant_id_from_request(self.request)
            if tenant_id is None:
                raise ValidationError({"detail": "Contexto tenant requerido para actualizar usuarios."})
            requested_tenant = serializer.validated_data.get("tenant_id")
            if requested_tenant not in (None, tenant_id):
                raise ValidationError({"tenant_id": "No puedes mover usuarios a otro tenant."})
            requested_groups = serializer.validated_data.get("groups")
            if requested_groups and any(getattr(g, "name", "") == "SuperAdmin SaaS" for g in requested_groups):
                raise ValidationError({"groups": "No autorizado para asignar SuperAdmin SaaS."})

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
        grupos = Group.objects.all()
        if not _is_saas_superadmin_user(request):
            grupos = grupos.exclude(name__in=["SuperAdmin SaaS", "Pantalla Sala"])
        serializer = GroupSerializer(grupos, many=True) 
        return Response(serializer.data)
    
    @action(detail=True, methods=["get", "post"])
    def red_familiar(self, request, pk=None):
        """
        GET: Devuelve la lista de delegados/dependientes de este usuario.
        POST: Recibe una lista de IDs y actualiza sus conexiones.
        """
        user = self.get_object()
        
        if request.method == "POST":
            dependientes_ids = request.data.get("dependientes", [])
            # .set() reemplaza las relaciones actuales por las nuevas
            user.dependientes.set(dependientes_ids)
            user.save()
            return Response({"status": "Red familiar actualizada"})
            
        # Si es GET
        serializer = UserAdminSerializer(user)
        return Response(serializer.data.get("dependientes_detalle", []))

class MenuItemAdminViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all().order_by("order")
    serializer_class = MenuItemAdminSerializer
    permission_classes = [permissions.IsAdminUser]

class PermisoVistaAdminViewSet(viewsets.ModelViewSet):
    queryset = PermisoVista.objects.all().order_by("codename")
    serializer_class = PermisoVistaAdminSerializer
    permission_classes = [permissions.IsAdminUser]

class GroupViewSet(viewsets.ModelViewSet):
    """Para que el frontend pueda listar los grupos disponibles y asignarlos"""
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = Group.objects.all()
        if _is_saas_superadmin_user(self.request):
            return qs
        return qs.exclude(name__in=["SuperAdmin SaaS", "Pantalla Sala"])

    def perform_create(self, serializer):
        name = (serializer.validated_data.get("name") or "").strip()
        if not name:
            raise ValidationError({"name": "Nombre de rol requerido."})
        if len(name) < 3:
            raise ValidationError({"name": "El nombre del rol debe tener al menos 3 caracteres."})

        reserved_for_superadmin = {"SuperAdmin SaaS", "Pantalla Sala"}
        if (not _is_saas_superadmin_user(self.request)) and (name in reserved_for_superadmin):
            raise ValidationError({"name": f"No autorizado para crear el rol '{name}'."})

        exists = Group.objects.filter(name__iexact=name).exists()
        if exists:
            raise ValidationError({"name": "Ya existe un rol con ese nombre."})

        serializer.save(name=name)


class GuideContentViewSet(viewsets.ModelViewSet):
    queryset = GuideContent.objects.all().order_by("key")
    serializer_class = GuideContentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["key", "is_active"]

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        if _is_saas_superadmin_user(self.request):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = GuideContent.objects.all().order_by("key")
        if _is_saas_superadmin_user(self.request):
            return qs
        # Non-superadmin can only read active records.
        return qs.filter(is_active=True)

    def perform_create(self, serializer):
        if not _is_saas_superadmin_user(self.request):
            raise ValidationError({"detail": "Solo SuperAdmin SaaS puede crear contenido de guia."})
        serializer.save()

    def perform_update(self, serializer):
        if not _is_saas_superadmin_user(self.request):
            raise ValidationError({"detail": "Solo SuperAdmin SaaS puede actualizar contenido de guia."})
        serializer.save()

    def perform_destroy(self, instance):
        if not _is_saas_superadmin_user(self.request):
            raise ValidationError({"detail": "Solo SuperAdmin SaaS puede eliminar contenido de guia."})
        instance.delete()

class SidebarBrandingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Intentamos obtener la configuración actual o devolvemos una por defecto
        tenant_id = _active_tenant_id_from_request(request) or request.user.tenant_id
        if tenant_id is None:
            return Response({"detail": "tenant_id requerido para branding"}, status=400)
        branding, created = SidebarBranding.objects.get_or_create(tenant_id=tenant_id)
        serializer = SidebarBrandingSerializer(branding)
        return Response(serializer.data)

    def patch(self, request):
        # Solo administradores pueden cambiar el diseño
        if not request.user.is_staff:
            return Response({"detail": "No autorizado"}, status=403)
            
        tenant_id = _active_tenant_id_from_request(request) or request.user.tenant_id
        if tenant_id is None:
            return Response({"detail": "tenant_id requerido para branding"}, status=400)
        branding, _ = SidebarBranding.objects.get_or_create(tenant_id=tenant_id)
        serializer = SidebarBrandingSerializer(branding, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class MiRedFamiliarView(APIView):
    """
    Permite a Andrea (o cualquier usuario) ver su propia red 
    sin pasar por el filtro de seguridad de Administrador.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Usamos el serializador que ya creamos con dependientes_detalle
        # Se filtra automáticamente por el usuario que envía el Token (request.user)
        serializer = UserSerializer(request.user)
        return Response(serializer.data.get("dependientes_detalle", []))
    

def _get_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _active_tenant_id_from_request(request):
    tenant_id = request.headers.get("X-Tenant-ID")
    if not tenant_id and getattr(request, "auth", None):
        tenant_id = request.auth.get("tenant_id")
    try:
        return int(tenant_id) if tenant_id not in (None, "") else None
    except (TypeError, ValueError):
        return None


PERMISSION_FEATURE_MAP = {
    "gestion_pacientes": "registro_pacientes",
    "gestion_agenda": "agenda_basica",
    "admin_citas": "agenda_basica",
    "recepcion_sala": "agenda_basica",
    "atencion_consultorio": "agenda_basica",
    "portal_content_admin": "portal_web_completo",
    "admin_convocatorias_gestion": "portal_web_completo",
    "admin_pqrs_gestion": "pqrs",
    "api_admin_access": "api_publica",
    "saas_tenants_admin": "api_publica",
    "saas_guide_content_admin": "api_publica",
}

MENU_FEATURE_MAP = {
    "/dashboard": "dashboard_basico",
    "/dashboard/admin/pacientes": "registro_pacientes",
    "/dashboard/admin/agenda": "agenda_basica",
    "/dashboard/admin/citas": "agenda_basica",
    "/dashboard/admin/recepcion": "agenda_basica",
    "/dashboard/doctor/atencion": "agenda_basica",
    "/admin/portal/content": "portal_web_completo",
    "/dashboard/admin/convocatorias-gestion": "portal_web_completo",
    "/dashboard/admin/pqrs-gestion": "pqrs",
    "/dashboard/admin/tenants": "api_publica",
    "/dashboard/admin/guia-ayuda": "api_publica",
}


def _build_policy_headers(request):
    headers = {}
    auth = request.headers.get("Authorization")
    if auth:
        headers["Authorization"] = auth
    for key in ["X-Tenant-ID", "X-Tenant-Domain", "X-Tenant-Timestamp", "X-Tenant-Signature", "X-Tenant-Schema"]:
        val = request.headers.get(key)
        if val:
            headers[key] = val
    return headers


def _get_tenant_policy(request):
    tenant_id = _active_tenant_id_from_request(request)
    if tenant_id is None:
        return {}
    try:
        response = requests.get(
            settings.TENANT_POLICY_URL,
            headers=_build_policy_headers(request),
            timeout=int(getattr(settings, "TENANT_POLICY_TIMEOUT_SEC", 5)),
        )
    except requests.RequestException:
        return {}
    if response.status_code != 200:
        return {}
    try:
        return response.json().get("features", {}) or {}
    except Exception:
        return {}


def _is_feature_enabled(feature_rules, feature_code: str) -> bool:
    if not feature_code:
        return True
    rule = (feature_rules or {}).get(feature_code) or {}
    return bool(rule.get("enabled", False))


def _is_saas_superadmin_user(request) -> bool:
    if getattr(request.user, "is_superuser", False):
        return True
    try:
        return request.user.groups.filter(name="SuperAdmin SaaS").exists()
    except Exception:
        return False

class AuditoriaViewSet(viewsets.ModelViewSet):
    queryset = Auditoria.objects.all().order_by("-fecha")
    serializer_class = AuditoriaSerializer
    permission_classes = [permissions.IsAdminUser]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "usuario_id": ["exact"],
        "modulo": ["exact"],
        "accion": ["exact"],
        "recurso": ["exact"],
        "recurso_id": ["exact"],
        "fecha": ["gte", "lte"],
    }
    search_fields = ["descripcion", "modulo", "accion", "recurso", "recurso_id"]
    ordering_fields = ["fecha"]
    ordering = ["-fecha"]

    @action(detail=False, methods=["post"], url_path="registrar", permission_classes=[AllowAny])
    def registrar(self, request):
        """
        Endpoint para registrar auditoría desde otros microservicios (protegido por token interno).
        """
        token = request.headers.get("X-INTERNAL-TOKEN", "")
        expected = getattr(settings, "INTERNAL_AUDIT_TOKEN", "") or ""

        # ✅ comparación segura
        if not token or not expected or not hmac.compare_digest(token, expected):
            return Response({"detail": "Token inválido"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ opcional: completar ip/user_agent si el emisor no lo manda
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        data.setdefault("ip", _get_ip(request))
        data.setdefault("user_agent", request.META.get("HTTP_USER_AGENT"))

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(self.get_serializer(obj).data, status=status.HTTP_201_CREATED)


def guardar_auditoria(
    request,
    descripcion,
    modulo="GENERAL",
    accion=None,
    recurso=None,
    recurso_id=None,
    metadata=None,
    usuario_id=None,
):
    """
    Helper centralizado para guardar auditoría desde cualquier view.
    - usuario_id: si no se pasa, se intenta tomar de request.user
    - ip: respeta X-Forwarded-For
    """
    uid = usuario_id
    if uid is None and hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
        uid = request.user.id

    ip = _get_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT")

    Auditoria.objects.create(
        descripcion=descripcion,
        usuario_id=uid,
        modulo=modulo,
        accion=accion,
        ip=ip,
        user_agent=user_agent,
        metadata=metadata,
        recurso=recurso,
        recurso_id=str(recurso_id) if recurso_id is not None else None,
    )
