import React, { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { FaSave } from 'react-icons/fa';

const lower = (v) => String(v || '').toLowerCase();

const prettyJson = (value) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch (_err) {
    return '{}';
  }
};

export default function GuideContentTab({ guideContent, onSaveGuideContent, saving }) {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [draft, setDraft] = useState({});

  const list = useMemo(() => {
    const q = lower(query).trim();
    if (!q) return guideContent;
    return guideContent.filter((g) =>
      lower(g.key).includes(q) ||
      lower(g.title).includes(q)
    );
  }, [guideContent, query]);

  const getDraft = (row) => draft[row.id] || {
    title: row.title || '',
    is_active: !!row.is_active,
    content: prettyJson(row.content),
  };

  const saveRow = async (row) => {
    const current = getDraft(row);
    let parsed;
    try {
      parsed = JSON.parse(current.content || '{}');
    } catch (_err) {
      Swal.fire('JSON invalido', 'El contenido no tiene formato JSON valido.', 'warning');
      return;
    }

    try {
      await onSaveGuideContent(row.id, {
        title: current.title,
        is_active: !!current.is_active,
        content: parsed,
      });
      Swal.fire({ icon: 'success', title: 'Contenido actualizado', timer: 1000, showConfirmButton: false });
    } catch (_err) {
      Swal.fire('Error', 'No se pudo actualizar GuideContent.', 'error');
    }
  };

  return (
    <section className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-black text-slate-800">Contenido de Guia/Ayuda</h2>
          <p className="text-xs text-slate-500">Tabla: {`users_guidecontent`}</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar key o title..."
          className="w-full max-w-sm border rounded-lg p-2 text-sm"
        />
      </div>

      <div className="space-y-3">
        {list.map((row) => {
          const d = getDraft(row);
          const isOpen = expandedId === row.id;
          return (
            <div key={row.id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800">{row.key}</p>
                  <p className="text-xs text-slate-500">{row.updated_at ? new Date(row.updated_at).toLocaleString() : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {row.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={() => setExpandedId(isOpen ? null : row.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    {isOpen ? 'Cerrar' : 'Editar'}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 space-y-2">
                  <input
                    value={d.title}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [row.id]: { ...d, title: e.target.value } }))}
                    className="w-full border rounded-lg p-2"
                    placeholder="Titulo"
                  />
                  <label className="text-xs inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!d.is_active}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [row.id]: { ...d, is_active: e.target.checked } }))}
                    />
                    Activo
                  </label>
                  <textarea
                    rows={10}
                    value={d.content}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [row.id]: { ...d, content: e.target.value } }))}
                    className="w-full border rounded-lg p-3 font-mono text-xs"
                  />
                  <button
                    disabled={saving}
                    onClick={() => saveRow(row)}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-2"
                  >
                    <FaSave /> Guardar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
