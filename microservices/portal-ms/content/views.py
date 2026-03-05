from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Banner,
    VideoGaleria,
    PortalTheme,
    MediaAsset,
    Page,
    PageSection,
)
from .serializers import (
    BannerSerializer,
    VideoGaleriaSerializer,
    PortalThemeSerializer,
    MediaAssetSerializer,
    PageSerializer,
    PageSectionSerializer,
)


# ------------------------
# HELPERS: Resolver assets/banners en PagePublicView
# ------------------------

def _collect_asset_ids(obj):
    """
    Recorre dict/list y recolecta valores de claves que terminan en '_asset_id'.
    Ejemplos:
    - image_asset_id
    - desktop_image_asset_id
    - mobile_image_asset_id
    """
    ids = set()

    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(k, str) and k.endswith("_asset_id") and v:
                try:
                    ids.add(int(v))
                except Exception:
                    pass
            ids.update(_collect_asset_ids(v))
    elif isinstance(obj, list):
        for item in obj:
            ids.update(_collect_asset_ids(item))

    return ids


def _collect_banner_ids_from_hero(sections):
    """
    Busca banner_id dentro de hero.data.slides[]
    """
    ids = set()
    for s in sections:
        if s.get("type") != "hero":
            continue
        data = s.get("data") or {}
        slides = data.get("slides") or []
        if isinstance(slides, list):
            for slide in slides:
                if isinstance(slide, dict) and slide.get("banner_id"):
                    try:
                        ids.add(int(slide["banner_id"]))
                    except Exception:
                        pass
    return ids


def _expand_assets_in_data(obj, asset_map):
    """
    Reemplaza claves *_asset_id por un objeto *_asset con info del asset.
    Mantiene el *_asset_id original.
    """
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            out[k] = _expand_assets_in_data(v, asset_map)

            if isinstance(k, str) and k.endswith("_asset_id") and v:
                try:
                    asset_id = int(v)
                except Exception:
                    asset_id = None

                if asset_id and asset_id in asset_map:
                    asset_key = k.replace("_asset_id", "_asset")
                    out[asset_key] = asset_map[asset_id]

        return out

    if isinstance(obj, list):
        return [_expand_assets_in_data(x, asset_map) for x in obj]

    return obj


def _expand_hero_banners(sections, banner_map):
    """
    En la sección hero, expande slides[].banner_id a slides[].banner = {...}
    """
    for s in sections:
        if s.get("type") != "hero":
            continue
        data = s.get("data") or {}
        slides = data.get("slides") or []
        if not isinstance(slides, list):
            continue

        new_slides = []
        for slide in slides:
            if not isinstance(slide, dict):
                new_slides.append(slide)
                continue

            banner_id = slide.get("banner_id")
            if banner_id:
                try:
                    bid = int(banner_id)
                except Exception:
                    bid = None
                if bid and bid in banner_map:
                    slide = {**slide, "banner": banner_map[bid]}

            new_slides.append(slide)

        s["data"] = {**data, "slides": new_slides}

    return sections


# ------------------------
# MIXIN ADMIN (Patrón MS)
# ------------------------

class AdminRoleMixin:
    """
    Permite acceso si:
    - is_staff o is_superuser
    - o roles incluye "Administrador"
    """
    admin_role_name = "Administrador"

    def _is_admin(self, request):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False

        if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
            return True

        roles = getattr(user, "roles", None) or []
        roles_norm = [str(r).lower() for r in roles]
        return self.admin_role_name.lower() in roles_norm

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method == "OPTIONS":
            return
        if not self._is_admin(request):
            raise PermissionDenied("No autorizado (se requiere rol Administrador / staff).")


# ------------------------
# PÚBLICO (GET)
# ------------------------

class BannerListView(generics.ListAPIView):
    queryset = Banner.objects.filter(activo=True).order_by("orden", "-created_at")
    serializer_class = BannerSerializer
    permission_classes = [AllowAny]


class VideoListView(generics.ListAPIView):
    queryset = VideoGaleria.objects.filter(activo=True).order_by("-id")
    serializer_class = VideoGaleriaSerializer
    permission_classes = [AllowAny]


class ThemePublicView(APIView):
    """
    Devuelve el theme actual (singleton).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        theme, _ = PortalTheme.objects.get_or_create(id=1)
        ser = PortalThemeSerializer(theme, context={"request": request})
        return Response(ser.data)


class PagePublicView(APIView):
    """
    Devuelve una página con sus secciones ACTIVAS (ej: home),
    y RESUELVE automáticamente:
      - *_asset_id -> *_asset (con file_url, etc.)
      - hero.slides[].banner_id -> hero.slides[].banner (con imagen_desktop_url/movil_url)

    GET /api/v1/portal/pages/<slug>/
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        page, _ = Page.objects.get_or_create(slug=slug, defaults={"title": slug})

        # Serial base (PageSerializer ya devuelve secciones activas)
        base = PageSerializer(page, context={"request": request}).data
        sections = base.get("sections") or []

        # 1) Recolectar asset_ids desde data de todas las secciones
        asset_ids = set()
        for s in sections:
            asset_ids.update(_collect_asset_ids(s.get("data") or {}))

        # 2) Obtener assets (1 query) + map serializado
        asset_map = {}
        if asset_ids:
            assets = MediaAsset.objects.filter(id__in=list(asset_ids))
            ser_assets = MediaAssetSerializer(assets, many=True, context={"request": request}).data
            asset_map = {a["id"]: a for a in ser_assets}

        # 3) Expandir assets en cada data
        sections = [
            {**s, "data": _expand_assets_in_data(s.get("data") or {}, asset_map)}
            for s in sections
        ]

        # 4) Expandir banners en hero slides (1 query)
        banner_ids = _collect_banner_ids_from_hero(sections)
        banner_map = {}
        if banner_ids:
            banners = Banner.objects.filter(id__in=list(banner_ids))
            ser_banners = BannerSerializer(banners, many=True, context={"request": request}).data
            banner_map = {b["id"]: b for b in ser_banners}

        sections = _expand_hero_banners(sections, banner_map)

        # 5) Respuesta final
        base["sections"] = sections
        return Response(base)


# ------------------------
# ADMIN (CRUD + UPLOAD)
# ------------------------

class BannerAdminViewSet(AdminRoleMixin, viewsets.ModelViewSet):
    queryset = Banner.objects.all().order_by("orden", "-created_at")
    serializer_class = BannerSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class VideoGaleriaAdminViewSet(AdminRoleMixin, viewsets.ModelViewSet):
    queryset = VideoGaleria.objects.all().order_by("-id")
    serializer_class = VideoGaleriaSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class ThemeAdminView(AdminRoleMixin, generics.RetrieveUpdateAPIView):
    """
    Admin: permite editar theme (singleton).
    GET/PATCH/PUT /api/v1/portal/admin/theme/
    """
    serializer_class = PortalThemeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        theme, _ = PortalTheme.objects.get_or_create(id=1)
        return theme


class MediaAssetAdminViewSet(AdminRoleMixin, viewsets.ModelViewSet):
    """
    Librería de assets (imágenes/videos/pdf) reutilizable.
    """
    queryset = MediaAsset.objects.all().order_by("-created_at")
    serializer_class = MediaAssetSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class PageAdminViewSet(AdminRoleMixin, viewsets.ModelViewSet):
    """
    CRUD de páginas (por ahora pocas: home).
    """
    queryset = Page.objects.all().order_by("slug")
    serializer_class = PageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]


class PageSectionAdminViewSet(AdminRoleMixin, viewsets.ModelViewSet):
    """
    CRUD de secciones para armar el Home dinámico:
    - order (orden)
    - is_active (visible)
    - data (JSON editable)
    """
    queryset = PageSection.objects.select_related("page").all().order_by("order", "id")
    serializer_class = PageSectionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def get_queryset(self):
        qs = super().get_queryset()
        page_slug = self.request.query_params.get("page")
        if page_slug:
            qs = qs.filter(page__slug=page_slug)
        return qs
    

class HomeSectionsAdminView(AdminRoleMixin, APIView):
    """
    Endpoint admin rápido para listar secciones del HOME ya filtradas y ordenadas.
    GET /api/v1/portal/admin/home/sections/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            PageSection.objects.select_related("page")
            .filter(page__slug="home")
            .order_by("order", "id")
        )
        ser = PageSectionSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)