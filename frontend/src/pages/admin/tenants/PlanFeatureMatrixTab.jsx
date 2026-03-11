import React, { useMemo, useState } from 'react';
import { FaCircle } from 'react-icons/fa';

const lower = (v) => String(v || '').toLowerCase();

function Semaphore({ enabled }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold">
      <FaCircle className={enabled ? 'text-emerald-500' : 'text-rose-500'} />
      {enabled ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export default function PlanFeatureMatrixTab({ plans, features, planFeatures }) {
  const [query, setQuery] = useState('');

  const filteredFeatures = useMemo(() => {
    const q = lower(query).trim();
    if (!q) return features;
    return features.filter((f) => lower(f.code).includes(q) || lower(f.name).includes(q));
  }, [features, query]);

  const matrix = useMemo(() => {
    const map = {};
    planFeatures.forEach((pf) => {
      map[`${pf.plan}_${pf.feature}`] = pf;
    });
    return map;
  }, [planFeatures]);

  return (
    <section className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-black text-slate-800">Matriz Plan vs Feature</h2>
          <p className="text-xs text-slate-500">Semaforo por regla de plan ({`tenancy_planfeature`}).</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar feature..."
          className="w-full max-w-xs border rounded-lg p-2 text-sm"
        />
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-black">Feature</th>
              {plans.map((p) => (
                <th key={p.id} className="text-left p-3 font-black">{p.code}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredFeatures.map((f) => (
              <tr key={f.id} className="border-t align-top">
                <td className="p-3">
                  <p className="font-bold text-slate-800">{f.code}</p>
                  <p className="text-xs text-slate-500">{f.name}</p>
                </td>
                {plans.map((p) => {
                  const rule = matrix[`${p.id}_${f.id}`];
                  return (
                    <td key={`${p.id}_${f.id}`} className="p-3">
                      <Semaphore enabled={!!rule?.enabled} />
                      {rule?.limit_int !== null && rule?.limit_int !== undefined ? (
                        <p className="text-[11px] text-slate-500 mt-1">Limite: {rule.limit_int}</p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1">Sin limite</p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

