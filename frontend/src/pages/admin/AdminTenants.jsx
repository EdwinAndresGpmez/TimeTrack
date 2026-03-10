import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { FaBuilding, FaSyncAlt, FaTable, FaLayerGroup, FaBook, FaBell } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import { tenancyService } from '../../services/tenancyService';
import { authService } from '../../services/authService';
import TenantOverridesTab from './tenants/TenantOverridesTab';
import PlanFeatureMatrixTab from './tenants/PlanFeatureMatrixTab';
import FeatureCatalogTab from './tenants/FeatureCatalogTab';
import PlanRulesTab from './tenants/PlanRulesTab';
import OverridesCatalogTab from './tenants/OverridesCatalogTab';
import GuideContentTab from './tenants/GuideContentTab';
import NotificationCenterTab from './tenants/NotificationCenterTab';

const normalizeList = (data) => (Array.isArray(data) ? data : data?.results || []);

const TABS = [
  { id: 'tenant_overrides', label: 'Tenant y Overrides', icon: FaBuilding },
  { id: 'matrix', label: 'Matriz Plan vs Feature', icon: FaTable },
  { id: 'feature_catalog', label: 'Catalogo Features', icon: FaLayerGroup },
  { id: 'plan_rules', label: 'Reglas por Plan', icon: FaLayerGroup },
  { id: 'override_catalog', label: 'Overrides por Tenant', icon: FaLayerGroup },
  { id: 'guide_content', label: 'Contenido Guia/Ayuda', icon: FaBook },
  { id: 'notifications', label: 'Notificaciones', icon: FaBell },
];

const TABLES_INFO = {
  featureCatalog: 'tenancy_feature',
  planFeatureRules: 'tenancy_planfeature',
  tenantFeatureOverride: 'tenancy_featureoverride',
  guideContent: 'users_guidecontent',
};

export default function AdminTenants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('tenant_overrides');

  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [planFeatures, setPlanFeatures] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [guideContent, setGuideContent] = useState([]);

  const [selectedTenantId, setSelectedTenantId] = useState(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [t, p, f, pf, s, ov, gc] = await Promise.all([
        tenancyService.getTenants(),
        tenancyService.getPlans(),
        tenancyService.getFeatures(),
        tenancyService.getPlanFeatures(),
        tenancyService.getSubscriptions(),
        tenancyService.getFeatureOverrides(),
        authService.getGuideContentAdmin(),
      ]);

      const tenantsData = normalizeList(t);
      setTenants(tenantsData);
      setPlans(normalizeList(p));
      setFeatures(normalizeList(f));
      setPlanFeatures(normalizeList(pf));
      setSubscriptions(normalizeList(s));
      setOverrides(normalizeList(ov));
      setGuideContent(normalizeList(gc));

      if (!selectedTenantId && tenantsData.length > 0) {
        setSelectedTenantId(tenantsData[0].id);
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar la administracion de tenants.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const tenantSubscriptionsMap = useMemo(() => {
    const map = {};
    subscriptions.forEach((s) => {
      const prev = map[s.tenant];
      if (!prev || new Date(s.created_at) > new Date(prev.created_at)) map[s.tenant] = s;
    });
    return map;
  }, [subscriptions]);

  const planRulesByPlanFeature = useMemo(() => {
    const map = {};
    planFeatures.forEach((x) => {
      map[`${x.plan}_${x.feature}`] = x;
    });
    return map;
  }, [planFeatures]);

  const getOverrideByFeature = (featureId, tenantId) =>
    overrides.find((o) => o.feature === featureId && o.tenant === tenantId) || null;

  const getEffectiveFeatureState = (featureId, planId, tenantId) => {
    const rule = planRulesByPlanFeature[`${planId}_${featureId}`];
    const planEnabled = !!rule?.enabled;
    const override = getOverrideByFeature(featureId, tenantId);
    const hasOverride = override && override.enabled !== null && override.enabled !== undefined;
    const effectiveEnabled = hasOverride ? !!override.enabled : planEnabled;
    return {
      planEnabled,
      hasOverride,
      overrideEnabled: hasOverride ? !!override.enabled : null,
      effectiveEnabled,
      limitInt: override?.limit_int ?? rule?.limit_int ?? null,
    };
  };

  const handlePlanChange = async (newPlanId) => {
    const sub = tenantSubscriptionsMap[selectedTenantId];
    if (!sub?.id) {
      Swal.fire('Sin suscripcion', 'No existe suscripcion activa para este tenant.', 'warning');
      return;
    }
    try {
      setSaving(true);
      await tenancyService.updateSubscription(sub.id, { plan: parseInt(newPlanId, 10) });
      await loadAll();
      Swal.fire('Actualizado', 'Plan asignado correctamente.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo actualizar el plan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeature = async (featureId, effectiveEnabled, tenantId, override) => {
    if (!tenantId) return;
    try {
      setSaving(true);
      const payload = {
        tenant: tenantId,
        feature: featureId,
        enabled: !effectiveEnabled,
      };
      if (override?.id) {
        await tenancyService.updateFeatureOverride(override.id, payload);
      } else {
        await tenancyService.createFeatureOverride(payload);
      }
      const ov = await tenancyService.getFeatureOverrides();
      setOverrides(normalizeList(ov));
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo actualizar el modulo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeature = async (featureId, payload) => {
    await tenancyService.updateFeature(featureId, payload);
    const data = await tenancyService.getFeatures();
    setFeatures(normalizeList(data));
  };

  const handleSavePlanFeature = async (id, payload) => {
    await tenancyService.updatePlanFeature(id, payload);
    const data = await tenancyService.getPlanFeatures();
    setPlanFeatures(normalizeList(data));
  };

  const handleSaveOverride = async (id, payload) => {
    await tenancyService.updateFeatureOverride(id, payload);
    const data = await tenancyService.getFeatureOverrides();
    setOverrides(normalizeList(data));
  };

  const handleSaveGuideContent = async (id, payload) => {
    await authService.updateGuideContent(id, payload);
    const data = await authService.getGuideContentAdmin();
    setGuideContent(normalizeList(data));
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TABS.some((x) => x.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', activeTab);
      return next;
    }, { replace: true });
  }, [activeTab, setSearchParams]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <FaBuilding className="text-blue-600" /> Administracion de Tenants SaaS
        </h1>
        <button
          onClick={loadAll}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-sm inline-flex items-center gap-2"
        >
          <FaSyncAlt /> Refrescar
        </button>
      </div>

      <section className="bg-white rounded-xl border p-4">
        <h2 className="font-black text-slate-700 text-sm mb-2">Tablas de referencia (auditoria rapida)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
          <p><b>Catalogo de modulos:</b> {TABLES_INFO.featureCatalog}</p>
          <p><b>Reglas por plan:</b> {TABLES_INFO.planFeatureRules}</p>
          <p><b>Override por tenant:</b> {TABLES_INFO.tenantFeatureOverride}</p>
          <p><b>Contenido guia/ayuda:</b> {TABLES_INFO.guideContent}</p>
        </div>
      </section>

      <div className="bg-white rounded-xl border p-2 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 ${
                isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon /> {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border p-6 text-slate-500">Cargando datos SaaS...</div>
      ) : (
        <>
          {activeTab === 'tenant_overrides' && (
            <TenantOverridesTab
              tenants={tenants}
              plans={plans}
              features={features}
              planFeatures={planFeatures}
              subscriptions={subscriptions}
              selectedTenantId={selectedTenantId}
              onSelectTenant={setSelectedTenantId}
              onChangePlan={handlePlanChange}
              getOverrideByFeature={getOverrideByFeature}
              getEffectiveFeatureState={getEffectiveFeatureState}
              onToggleFeature={handleToggleFeature}
              saving={saving}
            />
          )}

          {activeTab === 'matrix' && (
            <PlanFeatureMatrixTab
              plans={plans}
              features={features}
              planFeatures={planFeatures}
            />
          )}

          {activeTab === 'feature_catalog' && (
            <FeatureCatalogTab
              features={features}
              onSaveFeature={handleSaveFeature}
              saving={saving}
            />
          )}

          {activeTab === 'plan_rules' && (
            <PlanRulesTab
              plans={plans}
              features={features}
              planFeatures={planFeatures}
              onSavePlanFeature={handleSavePlanFeature}
              saving={saving}
            />
          )}

          {activeTab === 'override_catalog' && (
            <OverridesCatalogTab
              overrides={overrides}
              tenants={tenants}
              features={features}
              onSaveOverride={handleSaveOverride}
              saving={saving}
            />
          )}

          {activeTab === 'guide_content' && (
            <GuideContentTab
              guideContent={guideContent}
              onSaveGuideContent={handleSaveGuideContent}
              saving={saving}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationCenterTab
              tenants={tenants}
              selectedTenantId={selectedTenantId}
              onSelectTenant={setSelectedTenantId}
            />
          )}
        </>
      )}
    </div>
  );
}
