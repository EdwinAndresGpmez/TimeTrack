import React, { useMemo, useState } from 'react';
import { FaCheckCircle, FaEnvelopeOpenText, FaFilter, FaSave, FaSearch, FaSyncAlt } from 'react-icons/fa';
import { portalService } from '../../services/portalService';

const AdminConvocatoriasGestion = () => {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroLeido, setFiltroLeido] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await portalService.getAdminConvocatorias();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Error cargando convocatorias');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = filtroTexto.trim().toLowerCase();
    return (items || []).filter((x) => {
      if (filtroLeido === 'SI' && !x?.leido) return false;
      if (filtroLeido === 'NO' && x?.leido) return false;
      if (!q) return true;
      const bag = `${x?.nombre_completo || ''} ${x?.correo || ''} ${x?.telefono || ''} ${x?.perfil_profesional || ''}`.toLowerCase();
      return bag.includes(q);
    });
  }, [items, filtroLeido, filtroTexto]);

  const patchItemLocal = (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const guardarItem = async (id) => {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    try {
      setSavingId(id);
      setError('');
      setSuccess('');
      await portalService.updateAdminConvocatoria(id, { leido: Boolean(item.leido) });
      setSuccess(`Postulación #${id} actualizada`);
      setTimeout(() => setSuccess(''), 2200);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || `Error guardando postulación #${id}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Gestión Trabaje con Nosotros</h1>
            <p className="text-sm text-slate-500">Seguimiento de hojas de vida y postulaciones.</p>
          </div>
          <button
            onClick={cargar}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          >
            <FaSyncAlt /> {loading ? 'Actualizando...' : 'Refrescar'}
          </button>
        </div>

        {(error || success) && (
          <div className="mt-5 space-y-2">
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-slate-600">Buscar</label>
              <div className="mt-1 flex items-center rounded-xl border border-slate-200 px-3">
                <FaSearch className="text-slate-400" />
                <input
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                  placeholder="Nombre, correo, teléfono o perfil"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Leído</label>
              <select
                value={filtroLeido}
                onChange={(e) => setFiltroLeido(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="SI">Sí</option>
                <option value="NO">No</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {filtrados.map((x) => {
            const open = expandedId === x.id;
            return (
              <div key={x.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">#{x.id} • {x.nombre_completo}</p>
                    <p className="mt-1 text-sm text-slate-600">{x.correo} • {x.telefono}</p>
                    <p className="mt-1 text-xs text-slate-500">{x.perfil_profesional}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(x.fecha_postulacion).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${x.leido ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {x.leido ? <FaCheckCircle className="mr-1" /> : <FaEnvelopeOpenText className="mr-1" />}
                      {x.leido ? 'Leído' : 'Pendiente'}
                    </span>
                    <button
                      onClick={() => setExpandedId(open ? null : x.id)}
                      className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      <FaFilter className="mr-1" /> {open ? 'Ocultar' : 'Gestionar'}
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-slate-600">Hoja de vida</label>
                      <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                        {x.archivo_hv ? (
                          <a className="text-indigo-600 underline" href={x.archivo_hv} target="_blank" rel="noreferrer">Ver archivo</a>
                        ) : 'Sin archivo'}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">Estado de lectura</label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                        <input
                          id={`leido-${x.id}`}
                          type="checkbox"
                          checked={Boolean(x.leido)}
                          onChange={(e) => patchItemLocal(x.id, { leido: e.target.checked })}
                        />
                        <label htmlFor={`leido-${x.id}`} className="text-sm text-slate-700">Marcar como leído</label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-600">Mensaje adicional</label>
                      <p className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 whitespace-pre-line">
                        {x.mensaje_adicional || 'Sin mensaje adicional'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <button
                        onClick={() => guardarItem(x.id)}
                        disabled={savingId === x.id}
                        className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        <FaSave className="mr-2" /> {savingId === x.id ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!loading && filtrados.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No hay postulaciones para mostrar con esos filtros.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminConvocatoriasGestion;
