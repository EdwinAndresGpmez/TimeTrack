from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    FeatureOverrideViewSet,
    FeatureViewSet,
    PlanFeatureViewSet,
    PlanViewSet,
    ResolveTenantView,
    ProvisionTenantView,
    SelfSignupView,
    SubscriptionViewSet,
    TenantDomainViewSet,
    GatewayTenantResolveView,
    TenantPolicyView,
    TenantPolicyPublicView,
    TenantViewSet,
    UsageCounterViewSet,
)

router = DefaultRouter()
router.register(r"plans", PlanViewSet, basename="plan")
router.register(r"features", FeatureViewSet, basename="feature")
router.register(r"plan-features", PlanFeatureViewSet, basename="plan-feature")
router.register(r"tenants", TenantViewSet, basename="tenant")
router.register(r"domains", TenantDomainViewSet, basename="domain")
router.register(r"subscriptions", SubscriptionViewSet, basename="subscription")
router.register(r"feature-overrides", FeatureOverrideViewSet, basename="feature-override")
router.register(r"usage-counters", UsageCounterViewSet, basename="usage-counter")

urlpatterns = [
    path("", include(router.urls)),
    path("resolve", ResolveTenantView.as_view(), name="resolve-tenant"),
    path("gateway/resolve", GatewayTenantResolveView.as_view(), name="gateway-resolve-tenant"),
    path("policy/current", TenantPolicyView.as_view(), name="tenant-policy-current"),
    path("policy/public-current", TenantPolicyPublicView.as_view(), name="tenant-policy-public-current"),
    path("provision", ProvisionTenantView.as_view(), name="provision-tenant"),
    path("self-signup", SelfSignupView.as_view(), name="self-signup-tenant"),
]
