import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowUp,
  FaCalendarCheck,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaHospitalUser,
  FaLayerGroup,
  FaStethoscope,
  FaUserClock,
} from 'react-icons/fa';
import PatientOnboarding from '../../components/system/PatientOnboarding';
import { AuthContext } from '../../context/AuthContext';
import useTenantPolicy from '../../hooks/useTenantPolicy';
import { citasService } from '../../services/citasService';

const KPI_CARD_STYLES = [
  'from-cyan-500 to-cyan-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-indigo-500 to-indigo-600',
];

const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;

const Dashboard = () => {
  const { user, permissions } = useContext(AuthContext);
  const { loading: policyLoading, hasFeature, planCode } = useTenantPolicy();
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [errorResumen, setErrorResumen] = useState('');

  const isOperativeUser = useMemo(() => {
    if (user?.is_staff || user?.is_superuser) return true;
    const roles = (permissions?.roles || []).map((r) => String(r || '').toLowerCase());
    return roles.includes('admin') || roles.includes('administrador') || roles.includes('recepcion');
  }, [permissions?.roles, user?.is_staff, user?.is_superuser]);

  const dashboardBasico = hasFeature('dashboard_basico');
  const dashboardAvanzado = hasFeature('dashboard_avanzado');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isOperativeUser) {
        setLoadingResumen(false);
        return;
      }
      if (policyLoading) return;
      if (!dashboardBasico) {
        setLoadingResumen(false);
        return;
      }

      try {
        setLoadingResumen(true);
        setErrorResumen('');
        const data = await citasService.getDashboardResumen();
        if (mounted) setResumen(data || null);
      } catch (error) {
        const msg = error?.response?.data?.detail || 'No se pudo cargar el dashboard operativo.';
        if (mounted) setErrorResumen(msg);
      } finally {
        if (mounted) setLoadingResumen(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [dashboardBasico, isOperativeUser, policyLoading]);

  if (!isOperativeUser) {
    return (
      <div>
        <PatientOnboarding />
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-8 text-white mb-8">
          <h1 className="text-3xl font-bold">Bienvenido de nuevo, {user?.name || 'Usuario'}.</h1>
          <p className="mt-2 opacity-90">Tu panel personal esta listo para gestionar citas y seguimiento clinico.</p>
        </div>
      </div>
    );
  }

  const kpi = resumen?.kpis_basicos || {};
  const av = resumen?.kpis_avanzados || {};
  const serie7 = resumen?.series_basicas?.ultimos_7_dias || [];
  const maxTotalSerie = Math.max(1, ...serie7.map((d) => Number(d.total || 0)));

  const cards = [
    { label: 'Citas hoy', value: kpi.citas_hoy || 0, helper: 'Agenda diaria', icon: FaCalendarCheck },
    { label: 'Realizadas hoy', value: kpi.realizadas_hoy || 0, helper: 'Consultas cerradas', icon: FaCheckCircle },
    { label: 'Pendientes hoy', value: kpi.pendientes_hoy || 0, helper: 'Por gestionar', icon: FaClock },
    { label: 'No asistio 30 dias', value: kpi.no_asistio_30_dias || 0, helper: 'Riesgo operativo', icon: FaUserClock },
  ];

  return (
    <div className="space-y-6">
      <div
        className="rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-slate-700"
        style={{
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0e7490 100%)',
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-200">Control center operativo</p>
            <h1 className="text-3xl md:text-4xl font-black mt-2">Dashboard Clinico</h1>
            <p className="mt-2 text-slate-200">
              Plan: <span className="font-bold">{planCode || 'N/A'}</span> | Fecha corte:{' '}
              <span className="font-bold">{resumen?.periodo?.hoy || '-'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/20 px-4 py-3">
            <FaChartLine className="text-cyan-300" />
            <span className="text-sm font-semibold">Ocupacion hoy: {formatPct(kpi.ocupacion_hoy_pct)}</span>
          </div>
        </div>
      </div>

      {!policyLoading && !dashboardBasico && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 p-5">
          <p className="font-extrabold">Dashboard basico no incluido en tu plan</p>
          <p className="text-sm mt-1">Activa el modulo `dashboard_basico` para visualizar metricas operativas.</p>
        </div>
      )}

      {errorResumen && (
        <div className="rounded-2xl border border-red-300 bg-red-50 text-red-700 p-4 flex items-center gap-2">
          <FaExclamationTriangle />
          <span>{errorResumen}</span>
        </div>
      )}

      {loadingResumen ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-2xl border border-slate-200 bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        dashboardBasico &&
        resumen && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className={`rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${KPI_CARD_STYLES[idx % KPI_CARD_STYLES.length]}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{card.label}</p>
                      <Icon />
                    </div>
                    <p className="text-4xl font-black mt-3 leading-none">{card.value}</p>
                    <p className="text-xs mt-2 opacity-90">{card.helper}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-slate-900">Tendencia ultimos 7 dias</h2>
                  <span className="text-xs text-slate-500">Total de citas por dia</span>
                </div>
                <div className="mt-4 space-y-3">
                  {serie7.map((item) => {
                    const width = Math.max(4, Math.round((Number(item.total || 0) / maxTotalSerie) * 100));
                    return (
                      <div key={item.fecha}>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>{item.fecha}</span>
                          <span className="font-bold">{item.total}</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-extrabold text-slate-900">Acciones rapidas</h2>
                <div className="mt-4 space-y-2">
                  <Link to="/dashboard/admin/agenda" className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm">
                    <span className="flex items-center gap-2"><FaHospitalUser /> Agenda</span>
                    <FaArrowUp className="rotate-45 text-slate-400" />
                  </Link>
                  <Link to="/dashboard/admin/citas" className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm">
                    <span className="flex items-center gap-2"><FaStethoscope /> Gestion de Citas</span>
                    <FaArrowUp className="rotate-45 text-slate-400" />
                  </Link>
                  <Link to="/dashboard/admin/pacientes" className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm">
                    <span className="flex items-center gap-2"><FaLayerGroup /> Pacientes</span>
                    <FaArrowUp className="rotate-45 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-slate-900">Dashboard avanzado</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${dashboardAvanzado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {dashboardAvanzado ? 'Activo' : 'No incluido'}
                </span>
              </div>

              {dashboardAvanzado ? (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs text-slate-500">No-show 30 dias</p>
                    <p className="text-2xl font-black text-slate-900">{formatPct(av.no_show_rate_30_dias_pct)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs text-slate-500">Completion 30 dias</p>
                    <p className="text-2xl font-black text-slate-900">{formatPct(av.completion_rate_30_dias_pct)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs text-slate-500">Top servicios</p>
                    <p className="text-2xl font-black text-slate-900">{(av.top_servicios_30_dias || []).length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs text-slate-500">Top profesionales</p>
                    <p className="text-2xl font-black text-slate-900">{(av.top_profesionales_30_dias || []).length}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  Tu plan actual muestra solo metricas base. Activa `dashboard_avanzado` para KPIs avanzados y comparativos.
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
};

export default Dashboard;
