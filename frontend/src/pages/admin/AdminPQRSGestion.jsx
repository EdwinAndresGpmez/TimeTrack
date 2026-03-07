import React, { useMemo, useState } from 'react';
import { FaCheckCircle, FaClock, FaEnvelopeOpenText, FaFilter, FaSave, FaSearch, FaSyncAlt } from 'react-icons/fa';
import { portalService } from '../../services/portalService';

const ESTADOS = ['RECIBIDO', 'EN_TRAMITE', 'CERRADO'];

const estadoBadge = (estado) => {
  if (estado === 'CERRADO') return 'bg-emerald-100 text-emerald-700';
  if (estado === 'EN_TRAMITE') return 'bg-amber-100 text-amber-700';
  return 'bg-sky-100 text-sky-700';
};

const estadoLabel = (estado) => {
  if (estado === 'EN_TRAMITE') return 'En trámite';
  if (estado === 'CERRADO') return 'Cerrado';
  return 'Recibido';
};

const AdminPQRSGestion = () => {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState([]);

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await portalService.getAdminPQRS();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Error cargando PQRS');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    cargar();
  }, []);

  const tipos = useMemo(() => {
    const set = new Set((items || []).map((x) => x?.tipo).filter(Boolean));
    return Array.from(set);
  }, [items]);

  const filtrados = useMemo(() => {
    const q = filtroTexto.trim().toLowerCase();
    return (items || []).filter((x) => {
      if (filtroEstado && x?.estado !== filtroEstado) return false;
      if (filtroTipo && x?.tipo !== filtroTipo) return false;
      if (!q) return true;
      const bag = `${x?.nombre_remitente || ''} ${x?.correo || ''} ${x?.asunto || ''} ${x?.mensaje || ''}`.toLowerCase();
      return bag.includes(q);
    });
  }, [items, filtroEstado, filtroTipo, filtroTexto]);

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
      await portalService.updateAdminPQRS(id, {
        estado: item.estado,
        respuesta_interna: item.respuesta_interna || '',
      });
      setSuccess(`PQRS #${id} actualizada`);
      setTimeout(() => setSuccess(''), 2200);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || `Error guardando PQRS #${id}`);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Gestión PQRS</h1>
            <p className="text-sm text-slate-500">Respuesta y seguimiento de solicitudes del portal.</p>
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
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-600">Buscar</label>
              <div className="mt-1 flex items-center rounded-xl border border-slate-200 px-3">
                <FaSearch className="text-slate-400" />
                <input
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                  placeholder="Nombre, correo, asunto o mensaje"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {ESTADOS.map((e) => <option key={e} value={e}>{estadoLabel(e)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Tipo</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
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
                    <p className="text-sm font-black text-slate-900">#{x.id} • {x.tipo} • {x.asunto}</p>
                    <p className="mt-1 text-sm text-slate-600">{x.nombre_remitente} • {x.correo}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(x.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${estadoBadge(x.estado)}`}>
                      {x.estado === 'CERRADO' ? <FaCheckCircle className="mr-1" /> : x.estado === 'EN_TRAMITE' ? <FaClock className="mr-1" /> : <FaEnvelopeOpenText className="mr-1" />}
                      {estadoLabel(x.estado)}
                    </span>
                    <button
                      onClick={() => setExpandedId(open ? null : x.id)}
                      className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      <FaFilter className="mr-1" /> {open ? 'Ocultar' : 'Gestionar'}
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-700 whitespace-pre-line">{x.mensaje}</p>

                {open && (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-slate-600">Estado</label>
                      <select
                        value={x.estado}
                        onChange={(e) => patchItemLocal(x.id, { estado: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        {ESTADOS.map((e) => <option key={e} value={e}>{estadoLabel(e)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">Adjunto</label>
                      <div className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                        {x.adjunto ? (
                          <a className="text-indigo-600 underline" href={x.adjunto} target="_blank" rel="noreferrer">Ver archivo</a>
                        ) : 'Sin adjunto'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-600">Respuesta / seguimiento interno</label>
                      <textarea
                        rows={4}
                        value={x.respuesta_interna || ''}
                        onChange={(e) => patchItemLocal(x.id, { respuesta_interna: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Escribe aquí la respuesta o notas de seguimiento..."
                      />
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
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No hay PQRS para mostrar con esos filtros.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPQRSGestion;
