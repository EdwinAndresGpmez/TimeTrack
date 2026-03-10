import hmac
from datetime import timedelta
from hashlib import sha256

import requests
from django.conf import settings
from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Feature, FeatureOverride, Plan, PlanFeature, Subscription, Tenant, TenantDomain, UsageCounter
from .serializers import (
    FeatureOverrideSerializer,
    FeatureSerializer,
    PlanFeatureSerializer,
    PlanSerializer,
    SubscriptionSerializer,
    TenantDomainSerializer,
    TenantSerializer,
    UsageCounterSerializer,
)


class IsSaaSSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if bool(getattr(request.user, "is_superuser", False)):
            return True
        roles = list(getattr(request.user, "roles", []) or [])
        return "SuperAdmin SaaS" in roles


class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated, IsSaaSSuperAdmin]
    filterset_fields = ["code", "is_active"]


class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.all()
    serializer_class = FeatureSerializer
    permission_classes = [permissions.IsAuthenticated, IsSaaSSuperAdmin]
    filterset_fields = ["code"]


class PlanFeatureViewSet(viewsets.ModelViewSet):
    queryset = PlanFeature.objects.select_related("plan", "feature").all()
    serializer_class = PlanFeatureSerializer
    permission_classes = [permissions.IsAuthenticated, IsSaaSSuperAdmin]
    filterset_fields = ["plan", "feature", "enabled"]


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated, IsSaaSSuperAdmin]
    filterset_fields = ["slug", "schema_name", "status"]


class TenantDomainViewSet(viewsets.ModelViewSet):
    queryset = TenantDomain.objects.select_related("tenant").all()
    serializer_class = TenantDomainSerializer
    permission_classes = [permissions.IsAuthenticated, IsSaaSSuperAdmin]
    filterset_fields = ["tenant", "domain", "is_primary"]


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.select_related("tenant", "plan").all()
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsSaaSSuperAdmin]
    filterset_fields = ["tenant", "plan", "status"]


class FeatureOverrideViewSet(viewsets.ModelViewSet):
    queryset = FeatureOverride.objects.select_related("tenant", "feature").all()
    serializer_class = FeatureOverrideSerializer
    permission_classes = [permissions.IsAuthenticated, IsSaaSSuperAdmin]
    filterset_fields = ["tenant", "feature", "enabled"]


class UsageCounterViewSet(viewsets.ModelViewSet):
    queryset = UsageCounter.objects.select_related("tenant", "feature").all()
    serializer_class = UsageCounterSerializer
    permission_classes = [permissions.IsAuthenticated, IsSaaSSuperAdmin]
    filterset_fields = ["tenant", "feature", "period_ym"]


def _is_endpoint_signature_enforced() -> bool:
    return bool(getattr(settings, "TENANT_SIGNATURE_REQUIRED", False))


def _require_valid_signature_for_critical(request):
    if not _is_endpoint_signature_enforced():
        return None
    if not bool(getattr(request, "tenant_signature_valid", False)):
        return Response({"detail": "tenant signature required"}, status=403)
    return None


def _schema_name_from_slug(slug: str) -> str:
    return f"tenant_{slug.replace('-', '_')}"


def _create_schema_if_needed(schema_name: str):
    with connection.cursor() as cursor:
        cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')


def _create_admin_user_if_requested(admin_data: dict, tenant_id: int):
    if not admin_data:
        return None, None

    payload = {
        "username": admin_data.get("username") or admin_data.get("documento"),
        "correo": admin_data.get("correo"),
        "nombre": admin_data.get("nombre"),
        "apellidos": admin_data.get("apellidos") or "",
        "tipo_documento": admin_data.get("tipo_documento") or "CC",
        "documento": admin_data.get("documento"),
        "numero": admin_data.get("numero") or admin_data.get("documento") or "0",
        "password": admin_data.get("password"),
        "acepta_tratamiento_datos": True,
        "tenant_id": tenant_id,
        "tenant_slug": admin_data.get("tenant_slug"),
    }

    ts = int(timezone.now().timestamp())
    tenant_domain = (admin_data.get("tenant_domain") or "").strip().lower()
    if not tenant_domain:
        # fallback to localhost for non-domain bootstrap flows
        tenant_domain = "localhost"
    signature_payload = f"{tenant_id}:{tenant_domain}:{ts}".encode("utf-8")
    signature = hmac.new(
        (settings.TENANT_HEADER_SIGNING_KEY or "").encode("utf-8"),
        signature_payload,
        sha256,
    ).hexdigest()

    headers = {
        "X-Tenant-ID": str(tenant_id),
        "X-Tenant-Domain": tenant_domain,
        "X-Tenant-Timestamp": str(ts),
        "X-Tenant-Signature": signature,
    }

    resp = requests.post(
        settings.AUTH_REGISTER_URL,
        json=payload,
        headers=headers,
        timeout=20,
    )
    if resp.status_code >= 400:
        return None, {"status_code": resp.status_code, "body": resp.text}
    return resp.json(), None


@transaction.atomic
def _provision_tenant(payload: dict):
    raw_slug = (payload.get("slug") or "").strip().lower()
    legal_name = (payload.get("legal_name") or "").strip()
    primary_domain = (payload.get("primary_domain") or "").strip().lower()
    plan_code = (payload.get("plan_code") or "FREE").strip().upper()
    admin_user = payload.get("admin_user") or {}

    if not raw_slug or not legal_name or not primary_domain:
        return None, {"detail": "slug, legal_name and primary_domain are required"}, 400

    slug = slugify(raw_slug)
    if not slug:
        return None, {"detail": "invalid slug"}, 400

    if Tenant.objects.filter(Q(slug=slug) | Q(primary_domain=primary_domain)).exists():
        return None, {"detail": "tenant or domain already exists"}, 409

    plan = Plan.objects.filter(code=plan_code, is_active=True).first()
    if not plan:
        return None, {"detail": f"plan '{plan_code}' not found"}, 404

    schema_name = _schema_name_from_slug(slug)
    if Tenant.objects.filter(schema_name=schema_name).exists():
        return None, {"detail": "schema already exists"}, 409

    now = timezone.now()

    tenant = Tenant.objects.create(
        slug=slug,
        legal_name=legal_name,
        schema_name=schema_name,
        primary_domain=primary_domain,
        status="ACTIVE",
        metadata={
            "onboarding": {
                "status": "PENDING",
                "started_at": now.isoformat(),
                "steps": [
                    "configurar_parametricas",
                    "crear_profesionales",
                    "configurar_agenda",
                    "activar_portal_citas",
                ],
            }
        },
    )
    TenantDomain.objects.create(
        tenant=tenant,
        domain=primary_domain,
        is_primary=True,
    )

    subscription = Subscription.objects.create(
        tenant=tenant,
        plan=plan,
        status="TRIAL" if plan.code == "FREE" else "ACTIVE",
        starts_at=now,
        trial_ends_at=now + timedelta(days=14) if plan.code == "FREE" else None,
        ends_at=None,
        auto_renew=True,
    )

    _create_schema_if_needed(schema_name)
    admin_user["tenant_domain"] = primary_domain
    admin_user["tenant_slug"] = slug
    auth_response, auth_error = _create_admin_user_if_requested(admin_user, tenant.id)

    return {
        "tenant": TenantSerializer(tenant).data,
        "subscription": SubscriptionSerializer(subscription).data,
        "schema_created": True,
        "auth_admin": auth_response,
        "auth_admin_error": auth_error,
        "onboarding_required": True,
        "next_steps": [
            {"code": "configurar_parametricas", "label": "Configurar Parametricas"},
            {"code": "crear_profesionales", "label": "Crear Profesionales"},
            {"code": "configurar_agenda", "label": "Configurar Agenda"},
            {"code": "activar_portal_citas", "label": "Activar Portal de Citas"},
        ],
    }, None, 201


class ResolveTenantView(APIView):
    """
    Resolve tenant by domain. Used by gateway/bootstrap services.
    GET /api/v1/tenancy/resolve?domain=clinicamed.app.idefnova.com
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        domain = request.query_params.get("domain", "").strip().lower()
        if not domain:
            return Response({"detail": "domain is required"}, status=400)

        tenant_domain = TenantDomain.objects.select_related("tenant").filter(domain=domain).first()
        if not tenant_domain:
            tenant = Tenant.objects.filter(primary_domain=domain).first()
        else:
            tenant = tenant_domain.tenant

        if not tenant:
            return Response({"detail": "tenant not found"}, status=404)

        return Response(
            {
                "tenant_id": tenant.id,
                "tenant_slug": tenant.slug,
                "schema_name": tenant.schema_name,
                "status": tenant.status,
                "primary_domain": tenant.primary_domain,
            }
        )


class GatewayTenantResolveView(APIView):
    """
    Internal endpoint for gateway.
    Returns tenant headers and HMAC signature.
    """

    permission_classes = [permissions.AllowAny]

    def _is_internal_allowed(self, request) -> bool:
        require_token = bool(getattr(settings, "GATEWAY_RESOLVE_REQUIRE_TOKEN", False))
        if not require_token:
            return True

        expected = getattr(settings, "INTERNAL_SERVICE_TOKEN", "") or ""
        if not expected:
            return True

        provided = request.headers.get("X-Internal-Token", "")
        if not provided:
            return False
        return hmac.compare_digest(provided, expected)

    def _sign(self, tenant_id: int, domain: str, ts: int) -> str:
        signing_key = getattr(settings, "TENANT_HEADER_SIGNING_KEY", "") or ""
        payload = f"{tenant_id}:{domain}:{ts}".encode("utf-8")
        return hmac.new(signing_key.encode("utf-8"), payload, sha256).hexdigest()

    def get(self, request):
        if not self._is_internal_allowed(request):
            return Response({"detail": "forbidden"}, status=403)

        domain = (
            request.query_params.get("domain")
            or request.headers.get("X-Original-Host")
            or request.headers.get("Host")
            or ""
        ).strip().lower()

        now_ts = int(timezone.now().timestamp())
        tenant = None
        if domain:
            tenant_domain = TenantDomain.objects.select_related("tenant").filter(domain=domain).first()
            if tenant_domain:
                tenant = tenant_domain.tenant
            else:
                tenant = Tenant.objects.filter(primary_domain=domain).first()

        response = Response(status=204)
        response["X-Tenant-Domain"] = domain
        response["X-Tenant-Resolved"] = "0"

        if not tenant:
            return response

        signature = self._sign(tenant.id, domain, now_ts)
        response["X-Tenant-ID"] = str(tenant.id)
        response["X-Tenant-Slug"] = tenant.slug
        response["X-Tenant-Schema"] = tenant.schema_name
        response["X-Tenant-Timestamp"] = str(now_ts)
        response["X-Tenant-Signature"] = signature
        response["X-Tenant-Resolved"] = "1"
        return response


class TenantPolicyView(APIView):
    """
    Resolve effective policy for current tenant.
    Tenant is obtained from:
    1) X-Tenant-ID header (gateway path), or
    2) tenant_id claim in JWT (direct frontend path).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            invalid = _require_valid_signature_for_critical(request)
            if invalid:
                return invalid
        else:
            auth_token = getattr(request, "auth", None)
            tenant_id = auth_token.get("tenant_id") if auth_token else None
            if tenant_id in (None, ""):
                return Response({"detail": "tenant_id is required"}, status=400)

        try:
            tenant_id = int(tenant_id)
        except (TypeError, ValueError):
            return Response({"detail": "invalid tenant_id"}, status=400)

        tenant = Tenant.objects.filter(id=tenant_id).first()
        if not tenant:
            return Response({"detail": "tenant not found"}, status=404)

        now = timezone.now()
        subscription = (
            Subscription.objects.select_related("plan")
            .filter(
                tenant=tenant,
                status__in=["TRIAL", "ACTIVE", "PAST_DUE"],
            )
            .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
            .order_by("-created_at")
            .first()
        )

        if not subscription:
            return Response({"detail": "no active subscription"}, status=404)

        plan_rules = PlanFeature.objects.select_related("feature").filter(plan=subscription.plan)
        overrides = {
            x.feature_id: x
            for x in FeatureOverride.objects.select_related("feature").filter(tenant=tenant)
        }

        effective = {}
        for rule in plan_rules:
            ov = overrides.get(rule.feature_id)
            enabled = rule.enabled if not ov or ov.enabled is None else ov.enabled
            limit_int = rule.limit_int if not ov or ov.limit_int is None else ov.limit_int
            effective[rule.feature.code] = {
                "enabled": bool(enabled),
                "limit_int": limit_int,
            }

        return Response(
            {
                "tenant": {
                    "id": tenant.id,
                    "slug": tenant.slug,
                    "status": tenant.status,
                },
                "subscription": {
                    "id": subscription.id,
                    "status": subscription.status,
                    "plan_code": subscription.plan.code,
                },
                "features": effective,
            }
        )


def _build_effective_policy(tenant):
    now = timezone.now()
    subscription = (
        Subscription.objects.select_related("plan")
        .filter(
            tenant=tenant,
            status__in=["TRIAL", "ACTIVE", "PAST_DUE"],
        )
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gte=now))
        .order_by("-created_at")
        .first()
    )

    if not subscription:
        return None

    plan_rules = PlanFeature.objects.select_related("feature").filter(plan=subscription.plan)
    overrides = {
        x.feature_id: x
        for x in FeatureOverride.objects.select_related("feature").filter(tenant=tenant)
    }

    effective = {}
    for rule in plan_rules:
        ov = overrides.get(rule.feature_id)
        enabled = rule.enabled if not ov or ov.enabled is None else ov.enabled
        limit_int = rule.limit_int if not ov or ov.limit_int is None else ov.limit_int
        effective[rule.feature.code] = {
            "enabled": bool(enabled),
            "limit_int": limit_int,
        }

    return {
        "tenant": {
            "id": tenant.id,
            "slug": tenant.slug,
            "status": tenant.status,
        },
        "subscription": {
            "id": subscription.id,
            "status": subscription.status,
            "plan_code": subscription.plan.code,
        },
        "features": effective,
    }


class TenantPolicyPublicView(APIView):
    """
    Public policy for tenant-aware public portals.
    Requires valid signed tenant headers (X-Tenant-*).
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tenant_id = request.headers.get("X-Tenant-ID") or getattr(request, "tenant_id", None)
        if tenant_id in (None, ""):
            return Response({"detail": "tenant_id header is required"}, status=400)

        if not bool(getattr(request, "tenant_signature_valid", False)):
            return Response({"detail": "tenant signature required"}, status=403)

        try:
            tenant_id = int(tenant_id)
        except (TypeError, ValueError):
            return Response({"detail": "invalid tenant_id"}, status=400)

        tenant = Tenant.objects.filter(id=tenant_id).first()
        if not tenant:
            return Response({"detail": "tenant not found"}, status=404)

        payload = _build_effective_policy(tenant)
        if not payload:
            return Response({"detail": "no active subscription"}, status=404)
        return Response(payload)


class ProvisionTenantView(APIView):
    """
    Creates tenant + domain + subscription + local schema.
    Optionally creates admin user in auth-ms.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        invalid = _require_valid_signature_for_critical(request)
        if invalid:
            return invalid

        if not bool(getattr(request.user, "is_superuser", False)):
            return Response({"detail": "forbidden"}, status=403)
        data, error, code = _provision_tenant(request.data)
        if error:
            return Response(error, status=code)
        return Response(data, status=code)


class SelfSignupView(APIView):
    """
    Public signup for SaaS onboarding flow.
    Creates tenant in TRIAL/FREE and optional admin user.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = dict(request.data)
        payload["plan_code"] = (payload.get("plan_code") or "FREE").upper()
        if payload["plan_code"] != "FREE":
            return Response({"detail": "only FREE signup allowed in self-signup"}, status=403)
        data, error, code = _provision_tenant(payload)
        if error:
            return Response(error, status=code)
        return Response(data, status=code)
