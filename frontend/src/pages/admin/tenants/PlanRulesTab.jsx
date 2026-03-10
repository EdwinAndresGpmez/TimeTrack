import React, { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { FaSave } from 'react-icons/fa';

const lower = (v) => String(v || '').toLowerCase();

export default function PlanRulesTab({ plans, features, planFeatures, onSavePlanFeature, saving }) {
  const [query, setQuery] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [draft, setDraft] = useState({});

  const list = useMemo(() => {
    const q = lower(query).trim();
    return planFeatures
      .filter((pf) => (selectedPlanId ? String(pf.plan) === String(selectedPlanId) : true))
      .filter((pf) => {
        if (!q) return true;
        const feature = features.find((f) => f.id === pf.feature);
        const plan = plans.find((p) => p.id === pf.plan);
        return lower(feature?.code).includes(q) || lower(feature?.name).includes(q) || lower(plan?.code).includes(q);
      });
  }, [query, selectedPlanId, planFeatures, features, plans]);

  const getDraft = (pf) => draft[pf.id] || { enabled: !!pf.enabled, limit_int: pf.limit_int };

  const saveRow = async (pf) => {
    const row = getDraft(pf);
    try {
      await onSavePlanFeature(pf.id, {
        enabled: !!row.enabled,
        limit_int: row.limit_int === '' || row.limit_int === null || row.limit_int === undefined
          ? null
          : Number(row.limit_int),
      });
      Swal.fire({ icon: 'success', title: 'Regla actualizada', timer: 1000, showConfirmButton: false });
    } catch (_err) {
      Swal.fire('Error', 'No se pudo actualizar la regla del plan.', 'error');
    }
  };

  return (
    <section className="bg-white rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-black text-slate-800">Reglas por Plan</h2>
          <p className="text-xs text-slate-500">Tabla: {`tenancy_planfeature`}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="border rounded-lg p-2 text-sm"
          >
            <option value="">Todos los planes</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.code}</option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="border rounded-lg p-2 text-sm"
          />
        </div>
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-black">Plan</th>
              <th className="text-left p-3 font-black">Feature</th>
              <th className="text-left p-3 font-black">Enabled</th>
              <th className="text-left p-3 font-black">Limit</th>
              <th className="text-left p-3 font-black">Accion</th>
            </tr>
          </thead>
          <tbody>
            {list.map((pf) => {
              const feature = features.find((f) => f.id === pf.feature);
              const plan = plans.find((p) => p.id === pf.plan);
              const row = getDraft(pf);
              return (
                <tr key={pf.id} className="border-t">
                  <td className="p-3 font-bold">{plan?.code || pf.plan_code || pf.plan}</td>
                  <td className="p-3">
                    <p className="font-mono text-xs">{feature?.code || pf.feature_code || pf.feature}</p>
                    <p className="text-xs text-slate-500">{feature?.name || ''}</p>
                  </td>
                  <td className="p-3">
                    <select
                      value={row.enabled ? '1' : '0'}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [pf.id]: { ...row, enabled: e.target.value === '1' } }))}
                      className="border rounded-lg p-2"
                    >
                      <option value="1">Activo</option>
                      <option value="0">Inactivo</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={row.limit_int ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [pf.id]: { ...row, limit_int: e.target.value } }))}
                      placeholder="Sin limite"
                      className="border rounded-lg p-2 w-32"
                    />
                  </td>
                  <td className="p-3">
                    <button
                      disabled={saving}
                      onClick={() => saveRow(pf)}
                      className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-2"
                    >
                      <FaSave /> Guardar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
