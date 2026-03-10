from rest_framework import serializers

from .models import Feature, FeatureOverride, Plan, PlanFeature, Subscription, Tenant, TenantDomain, UsageCounter


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = "__all__"


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = "__all__"


class PlanFeatureSerializer(serializers.ModelSerializer):
    plan_code = serializers.CharField(source="plan.code", read_only=True)
    feature_code = serializers.CharField(source="feature.code", read_only=True)

    class Meta:
        model = PlanFeature
        fields = "__all__"


class TenantDomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantDomain
        fields = "__all__"


class TenantSerializer(serializers.ModelSerializer):
    domains = TenantDomainSerializer(many=True, read_only=True)

    class Meta:
        model = Tenant
        fields = "__all__"


class SubscriptionSerializer(serializers.ModelSerializer):
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    plan_code = serializers.CharField(source="plan.code", read_only=True)

    class Meta:
        model = Subscription
        fields = "__all__"


class FeatureOverrideSerializer(serializers.ModelSerializer):
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    feature_code = serializers.CharField(source="feature.code", read_only=True)

    class Meta:
        model = FeatureOverride
        fields = "__all__"


class UsageCounterSerializer(serializers.ModelSerializer):
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    feature_code = serializers.CharField(source="feature.code", read_only=True)

    class Meta:
        model = UsageCounter
        fields = "__all__"
