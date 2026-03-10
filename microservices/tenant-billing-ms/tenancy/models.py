from django.db import models


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Plan(TimestampedModel):
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    currency = models.CharField(max_length=10, default="COP")
    price_cop_yearly = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["price_cop_yearly", "name"]

    def __str__(self):
        return f"{self.code} ({self.price_cop_yearly} {self.currency}/year)"


class Feature(TimestampedModel):
    code = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return self.code


class PlanFeature(TimestampedModel):
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="feature_rules")
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE, related_name="plan_rules")
    enabled = models.BooleanField(default=False)
    limit_int = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ("plan", "feature")
        indexes = [models.Index(fields=["plan", "feature", "enabled"])]

    def __str__(self):
        return f"{self.plan.code}:{self.feature.code}={self.enabled}"


class Tenant(TimestampedModel):
    STATUS_CHOICES = [
        ("ACTIVE", "ACTIVE"),
        ("PAST_DUE", "PAST_DUE"),
        ("SUSPENDED", "SUSPENDED"),
        ("CANCELLED", "CANCELLED"),
    ]

    slug = models.SlugField(max_length=100, unique=True)
    legal_name = models.CharField(max_length=160)
    schema_name = models.CharField(max_length=100, unique=True)
    primary_domain = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["legal_name"]

    def __str__(self):
        return f"{self.slug} ({self.status})"


class TenantDomain(TimestampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="domains")
    domain = models.CharField(max_length=255, unique=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["domain", "is_primary"])]

    def __str__(self):
        return self.domain


class Subscription(TimestampedModel):
    STATUS_CHOICES = [
        ("TRIAL", "TRIAL"),
        ("ACTIVE", "ACTIVE"),
        ("PAST_DUE", "PAST_DUE"),
        ("CANCELLED", "CANCELLED"),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="TRIAL")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=["tenant", "status", "ends_at"])]

    def __str__(self):
        return f"{self.tenant.slug} -> {self.plan.code} ({self.status})"


class FeatureOverride(TimestampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="feature_overrides")
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE, related_name="tenant_overrides")
    enabled = models.BooleanField(null=True, blank=True)
    limit_int = models.IntegerField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("tenant", "feature")
        indexes = [models.Index(fields=["tenant", "feature"])]

    def __str__(self):
        return f"{self.tenant.slug}:{self.feature.code}"


class UsageCounter(TimestampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="usage_counters")
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE, related_name="usage_counters")
    period_ym = models.CharField(max_length=7, help_text="YYYY-MM")
    consumed = models.BigIntegerField(default=0)

    class Meta:
        unique_together = ("tenant", "feature", "period_ym")
        indexes = [models.Index(fields=["tenant", "feature", "period_ym"])]

    def __str__(self):
        return f"{self.tenant.slug}:{self.feature.code}:{self.period_ym}={self.consumed}"
