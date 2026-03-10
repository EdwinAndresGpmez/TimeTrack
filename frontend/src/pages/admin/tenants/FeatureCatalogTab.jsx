import React, { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { FaSave } from 'react-icons/fa';

const lower = (v) => String(v || '').toLowerCase();

export default function FeatureCatalogTab({ features, onSaveFeature, saving }) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({});

  const filtered = useMemo(() => {
    const q = lower(query).trim();
    if (!q) return features;
    return features.filter((f) => lower(f.code).includes(q) || lower(f.name).includes(q) || lower(f.description).includes(q));
  }, [features, query]);

  const getDraft = (feature) => draft[feature.id] || { name: feature.name || '', description: feature.description || '' };

  const saveRow = async (feature) => {
    try {
      const payload = getDraft(feature);
      await onSaveFeature(feature.id, payload);
      Swal.fire({ icon: 'success', title: 'Feature actualizado', timer: 1000, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', 'No se pudo actualizar el feature.', 'error');
    }
  };

  return (
    <section className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-black text-slate-800">Catalogo de Features</h2>
          <p className="text-xs text-slate-500">Tabla: {`tenancy_feature`}</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por code, name, description..."
          className="w-full max-w-sm border rounded-lg p-2 text-sm"
        />
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-black">Code</th>
              <th className="text-left p-3 font-black">Nombre</th>
              <th className="text-left p-3 font-black">Descripcion</th>
              <th className="text-left p-3 font-black">Accion</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const row = getDraft(f);
              return (
                <tr key={f.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{f.code}</td>
                  <td className="p-3">
                    <input
                      value={row.name}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [f.id]: { ...row, name: e.target.value } }))}
                      className="w-full border rounded-lg p-2"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      value={row.description}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [f.id]: { ...row, description: e.target.value } }))}
                      className="w-full border rounded-lg p-2"
                    />
                  </td>
                  <td className="p-3">
                    <button
                      disabled={saving}
                      onClick={() => saveRow(f)}
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
