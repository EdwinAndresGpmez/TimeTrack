import React, { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { auditoriaService } from '../../services/auditoriaService';

const MySwal = withReactContent(Swal);

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const safeString = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

const Auditoria = () => {
  const [rowsRaw, setRowsRaw] = useState([]); // lo que llega del backend (array o results)
  const [count, setCount] = useState(null); // si viene paginado (DRF) => number
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [goToPage, setGoToPage] = useState('1');

  const [search, setSearch] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [modulo, setModulo] = useState('');
  const [accion, setAccion] = useState('');
  const [recurso, setRecurso] = useState('');
  const [recursoId, setRecursoId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ordering, setOrdering] = useState('-fecha');

  const [searchDebounced, setSearchDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const isServerPaginated = typeof count === 'number';

  const totalRecords = useMemo(() => {
    if (isServerPaginated) return count;
    return rowsRaw.length;
  }, [isServerPaginated, count, rowsRaw.length]);

  const totalPages = useMemo(() => {
    const total = totalRecords ?? 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [totalRecords, pageSize]);

  const rows = useMemo(() => {
    if (isServerPaginated) return rowsRaw;
    const start = (page - 1) * pageSize;
    return rowsRaw.slice(start, start + pageSize);
  }, [isServerPaginated, rowsRaw, page, pageSize]);

  useEffect(() => {
    setGoToPage(String(page));
  }, [page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const fetchAuditoria = async () => {
    setLoading(true);
    try {
      const params = {
        ordering
      };

      params.page = page;
      params.page_size = pageSize;

      if (searchDebounced.trim()) params.search = searchDebounced.trim();
      if (usuarioId.trim()) params.usuario_id = usuarioId.trim();
      if (modulo.trim()) params.modulo = modulo.trim();
      if (accion.trim()) params.accion = accion.trim();
      if (recurso.trim()) params.recurso = recurso.trim();
      if (recursoId.trim()) params.recurso_id = recursoId.trim();
      if (fechaDesde) params['fecha__gte'] = fechaDesde;
      if (fechaHasta) params['fecha__lte'] = fechaHasta;

      const data = await auditoriaService.getAll(params);

      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        setRowsRaw(data.results);
        setCount(typeof data.count === 'number' ? data.count : 0);
      } else if (Array.isArray(data)) {
        setRowsRaw(data);
        setCount(null);
      } else {
        setRowsRaw([]);
        setCount(null);
      }
    } catch (error) {
      console.error(error);
      MySwal.fire({
        icon: 'error',
        title: 'Error cargando auditoría',
        text: error?.response?.data?.detail || error?.response?.data?.detalle || 'No se pudo consultar la auditoría.'
      });
      setRowsRaw([]);
      setCount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditoria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    pageSize,
    ordering,
    searchDebounced,
    usuarioId,
    modulo,
    accion,
    recurso,
    recursoId,
    fechaDesde,
    fechaHasta
  ]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDebounced, usuarioId, modulo, accion, recurso, recursoId, fechaDesde, fechaHasta]);

  const verDetalle = (row) => {
    const meta = row?.metadata ? JSON.stringify(row.metadata, null, 2) : '—';
    MySwal.fire({
      title: 'Detalle de Auditoría',
      html: `
        <div style="text-align:left">
          <div><b>Fecha:</b> ${formatDate(row.fecha)}</div>
          <div><b>Usuario ID:</b> ${safeString(row.usuario_id)}</div>
          <div><b>Módulo:</b> ${safeString(row.modulo)}</div>
          <div><b>Acción:</b> ${safeString(row.accion)}</div>
          <div><b>Recurso:</b> ${safeString(row.recurso)} ${row.recurso_id ? `(#${row.recurso_id})` : ''}</div>
          <div><b>IP:</b> ${safeString(row.ip)}</div>
          <div><b>User-Agent:</b> ${safeString(row.user_agent)}</div>
          <hr/>
          <div><b>Descripción:</b><br/>${safeString(row.descripcion)}</div>
          <hr/>
          <div><b>Metadata:</b></div>
          <pre style="background:#0f172a;color:#e2e8f0;padding:12px;border-radius:12px;overflow:auto;max-height:280px;">${meta}</pre>
        </div>
      `,
      width: 900,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#4f46e5'
    });
  };

  const limpiarFiltros = () => {
    setSearch('');
    setUsuarioId('');
    setModulo('');
    setAccion('');
    setRecurso('');
    setRecursoId('');
    setFechaDesde('');
    setFechaHasta('');
    setOrdering('-fecha');
    setPage(1);
  };

  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  const onGoTo = () => {
    const n = parseInt(goToPage, 10);
    if (Number.isNaN(n)) return;
    setPage(Math.min(Math.max(1, n), totalPages));
  };

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Auditoría</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Registro de acciones del sistema (auth-ms). Filtra por usuario, módulo, fecha y texto.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchAuditoria}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow active:scale-95 transition"
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Refrescar'}
            </button>
            <button
              onClick={limpiarFiltros}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm shadow-sm active:scale-95 transition"
              disabled={loading}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Buscar</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Descripción / módulo / acción / recurso"
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Usuario ID</label>
            <input
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              placeholder="Ej: 12"
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Módulo</label>
            <input
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
              placeholder="AUTH / ADMIN / PROFILE..."
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Acción</label>
            <input
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              placeholder="POST_200 / LOGIN..."
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Orden</label>
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
            >
              <option value="-fecha">Más reciente</option>
              <option value="fecha">Más antiguo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Recurso</label>
            <input
              value={recurso}
              onChange={(e) => setRecurso(e.target.value)}
              placeholder="User / MenuItem..."
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Recurso ID</label>
            <input
              value={recursoId}
              onChange={(e) => setRecursoId(e.target.value)}
              placeholder="Ej: 7"
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
            />
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tamaño página</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="w-full mt-2 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition"
              disabled={loading}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <div className="text-xs text-gray-500 font-bold bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 w-full">
              {isServerPaginated
                ? `Total registros: ${totalRecords}`
                : `Total registros: ${totalRecords} (paginación local)`}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-auto min-h-[420px]">
          <table className="min-w-full text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Módulo</th>
                <th className="p-4">Acción</th>
                <th className="p-4">Recurso</th>
                <th className="p-4">Descripción</th>
                <th className="p-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400">
                    Cargando auditoría...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400">
                    No hay registros con esos filtros.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-indigo-50/30 transition">
                    <td className="p-4 whitespace-nowrap font-mono text-xs text-gray-600">{formatDate(r.fecha)}</td>
                    <td className="p-4 font-mono text-xs text-gray-700">{safeString(r.usuario_id)}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-gray-100 text-gray-700 border border-gray-200">
                        {safeString(r.modulo)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {safeString(r.accion)}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-700">
                      {safeString(r.recurso)}
                      {r.recurso_id ? ` #${r.recurso_id}` : ''}
                    </td>
                    <td className="p-4 text-xs text-gray-700 max-w-[520px]">
                      <div className="line-clamp-2">{safeString(r.descripcion)}</div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => verDetalle(r)}
                        className="px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-black text-xs active:scale-95 transition"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-gray-50 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-h-[72px]">
          <div className="text-xs text-gray-500 font-bold">
            Página {page} de {totalPages} • Mostrando {rows.length} • Total {totalRecords}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={goFirst}
              disabled={!canPrev}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-black text-xs disabled:opacity-50"
            >
              Primera
            </button>
            <button
              onClick={goPrev}
              disabled={!canPrev}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-black text-xs disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={goNext}
              disabled={!canNext}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-black text-xs disabled:opacity-50"
            >
              Siguiente
            </button>
            <button
              onClick={goLast}
              disabled={!canNext}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-black text-xs disabled:opacity-50"
            >
              Última
            </button>

            <div className="flex items-center gap-2 ml-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ir a</span>
              <input
                value={goToPage}
                onChange={(e) => setGoToPage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onGoTo();
                }}
                className="w-20 px-3 py-2 border rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
              <button
                onClick={onGoTo}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs disabled:opacity-50"
              >
                Ir
              </button>
            </div>

            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">
              {isServerPaginated ? 'Servidor' : 'Local'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auditoria;
