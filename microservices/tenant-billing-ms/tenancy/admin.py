from django.contrib import admin

from .models import Feature, FeatureOverride, Plan, PlanFeature, Subscription, Tenant, TenantDomain, UsageCounter

admin.site.register(Plan)
admin.site.register(Feature)
admin.site.register(PlanFeature)
admin.site.register(Tenant)
admin.site.register(TenantDomain)
admin.site.register(Subscription)
admin.site.register(FeatureOverride)
admin.site.register(UsageCounter)
