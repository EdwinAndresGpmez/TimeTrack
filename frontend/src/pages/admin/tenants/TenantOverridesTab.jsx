import React, { useMemo, useState } from 'react';
import { FaBuilding, FaLayerGroup, FaToggleOn } from 'react-icons/fa';

const searchText = (value) => String(value || '').toLowerCase();

export default function TenantOverridesTab({
  tenants,
  plans,
  features,
  planFeatures,
  subscriptions,
  selectedTenantId,
  onSelectTenant,
  onChangePlan,
  getOverrideByFeature,
  getEffectiveFeatureState,
  onToggleFeature,
  saving,
}) {
  const [query, setQuery] = useState('');

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId) || null,
    [tenants, selectedTenantId]
  );

  const tenantSubscription = useMemo(() => {
    if (!selectedTenantId) return null;
    const list = subscriptions.filter((s) => s.tenant === selectedTenantId);
    if (!list.length) return null;
    return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  }, [subscriptions, selectedTenantId]);

  const currentPlanId = tenantSubscription?.plan || '';

  const filteredFeatures = useMemo(() => {
    const q = searchText(query).trim();
    if (!q) return features;
    return features.filter((f) =>
      searchText(f.code).includes(q) ||
      searchText(f.name).includes(q) ||
      searchText(f.description).includes(q)
    );
  }, [features, query]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="bg-white rounded-xl border p-4 lg:col-span-1">
        <h2 className="font-black text-slate-700 mb-3">Clinicas afiliadas</h2>
        <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
          {tenants.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTenant(t.id)}
              className={`w-full text-left rounded-lg border p-3 transition ${
                t.id === selectedTenantId ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="font-bold text-slate-800">{t.legal_name}</p>
              <p className="text-xs text-slate-500">{t.slug}</p>
              <p className="text-xs text-slate-500">{t.primary_domain}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border p-4 lg:col-span-2">
        {!selectedTenant ? (
          <p className="text-slate-500">Selecciona una clinica para administrar plan y modulos.</p>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <FaBuilding className="text-blue-600" />
                  {selectedTenant.legal_name}
                </h2>
                <p className="text-xs text-slate-500">
                  slug: {selectedTenant.slug} | schema: {selectedTenant.schema_name} | estado: {selectedTenant.status}
                </p>
              </div>
              <div className="w-full md:w-72">
                <label className="text-xs font-bold text-slate-500">Plan comercial</label>
                <select
                  disabled={saving || !tenantSubscription}
                  value={currentPlanId}
                  onChange={(e) => onChangePlan(e.target.value)}
                  className="w-full mt-1 border rounded-lg p-2 text-sm"
                >
                  <option value="">Selecciona plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <h3 className="font-black text-slate-700 flex items-center gap-2">
                <FaLayerGroup className="text-indigo-600" /> Modulos (feature overrides)
              </h3>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar feature..."
                className="w-full max-w-xs border rounded-lg p-2 text-sm"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {filteredFeatures.map((f) => {
                const status = getEffectiveFeatureState(f.id, currentPlanId, selectedTenantId);
                const override = getOverrideByFeature(f.id, selectedTenantId);
                return (
                  <div key={f.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{f.name || f.code}</p>
                      <p className="text-xs text-slate-500">{f.code}</p>
                      <p className="text-xs text-slate-500 mt-1">{f.description || 'Sin descripcion funcional.'}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Plan: <b>{status.planEnabled ? 'Activo' : 'Inactivo'}</b>
                        {status.hasOverride ? ` | Override: ${status.overrideEnabled ? 'Activo' : 'Inactivo'}` : ' | Override: Heredado'}
                        {status.limitInt !== null && status.limitInt !== undefined ? ` | Limite: ${status.limitInt}` : ''}
                      </p>
                      <p className="text-[11px] mt-1">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${status.hasOverride ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          Origen: {status.hasOverride ? 'OVERRIDE' : 'PLAN'}
                        </span>
                      </p>
                    </div>
                    <button
                      disabled={saving}
                      onClick={() => onToggleFeature(f.id, status.effectiveEnabled, selectedTenantId, override)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        status.effectiveEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FaToggleOn />
                      {status.effectiveEnabled ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
