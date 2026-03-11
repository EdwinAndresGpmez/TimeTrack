import React, { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { FaSave } from 'react-icons/fa';

const lower = (v) => String(v || '').toLowerCase();

export default function OverridesCatalogTab({ overrides, tenants, features, onSaveOverride, saving }) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({});

  const list = useMemo(() => {
    const q = lower(query).trim();
    return overrides.filter((ov) => {
      if (!q) return true;
      const tenant = tenants.find((t) => t.id === ov.tenant);
      const feature = features.find((f) => f.id === ov.feature);
      return (
        lower(tenant?.legal_name).includes(q) ||
        lower(tenant?.slug).includes(q) ||
        lower(feature?.code).includes(q) ||
        lower(feature?.name).includes(q) ||
        lower(ov.reason).includes(q)
      );
    });
  }, [overrides, tenants, features, query]);

  const getDraft = (ov) => draft[ov.id] || {
    enabled: ov.enabled,
    limit_int: ov.limit_int,
    reason: ov.reason || '',
  };

  const saveRow = async (ov) => {
    const row = getDraft(ov);
    try {
      await onSaveOverride(ov.id, {
        enabled: row.enabled === '' ? null : row.enabled,
        limit_int: row.limit_int === '' || row.limit_int === null || row.limit_int === undefined ? null : Number(row.limit_int),
        reason: row.reason || '',
      });
      Swal.fire({ icon: 'success', title: 'Override actualizado', timer: 1000, showConfirmButton: false });
    } catch (_err) {
      Swal.fire('Error', 'No se pudo actualizar el override.', 'error');
    }
  };

  return (
    <section className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-black text-slate-800">Overrides por Tenant</h2>
          <p className="text-xs text-slate-500">Tabla: {`tenancy_featureoverride`}</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar tenant/feature/reason..."
          className="w-full max-w-sm border rounded-lg p-2 text-sm"
        />
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-black">Tenant</th>
              <th className="text-left p-3 font-black">Feature</th>
              <th className="text-left p-3 font-black">Enabled</th>
              <th className="text-left p-3 font-black">Limit</th>
              <th className="text-left p-3 font-black">Reason</th>
              <th className="text-left p-3 font-black">Accion</th>
            </tr>
          </thead>
          <tbody>
            {list.map((ov) => {
              const tenant = tenants.find((t) => t.id === ov.tenant);
              const feature = features.find((f) => f.id === ov.feature);
              const row = getDraft(ov);
              return (
                <tr key={ov.id} className="border-t align-top">
                  <td className="p-3">
                    <p className="font-bold">{tenant?.legal_name || ov.tenant}</p>
                    <p className="text-xs text-slate-500">{tenant?.slug || ''}</p>
                  </td>
                  <td className="p-3 font-mono text-xs">{feature?.code || ov.feature_code || ov.feature}</td>
                  <td className="p-3">
                    <select
                      value={row.enabled === null || row.enabled === undefined ? '' : row.enabled ? '1' : '0'}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : e.target.value === '1';
                        setDraft((prev) => ({ ...prev, [ov.id]: { ...row, enabled: value } }));
                      }}
                      className="border rounded-lg p-2"
                    >
                      <option value="">Heredado</option>
                      <option value="1">Activo</option>
                      <option value="0">Inactivo</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={row.limit_int ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [ov.id]: { ...row, limit_int: e.target.value } }))}
                      placeholder="Sin limite"
                      className="border rounded-lg p-2 w-28"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={row.reason}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [ov.id]: { ...row, reason: e.target.value } }))}
                      className="border rounded-lg p-2 w-full"
                      placeholder="Motivo"
                    />
                  </td>
                  <td className="p-3">
                    <button
                      disabled={saving}
                      onClick={() => saveRow(ov)}
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

