import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaArrowUp,
  FaCalendarCheck,
  FaCalendarPlus,
  FaChartLine,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaHospitalUser,
  FaHeartbeat,
  FaLayerGroup,
  FaStethoscope,
  FaUserEdit,
  FaUserClock,
} from 'react-icons/fa';
import PatientOnboarding from '../../components/system/PatientOnboarding';
import { AuthContext } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import useTenantPolicy from '../../hooks/useTenantPolicy';
import { citasService } from '../../services/citasService';
import { patientService } from '../../services/patientService';

const KPI_CARD_STYLES = [
  'from-cyan-500 to-cyan-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-indigo-500 to-indigo-600',
];

const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;
const PATIENT_ACTIVE_STATUSES = ['PENDIENTE', 'ACEPTADA', 'CONFIRMADA', 'EN_SALA', 'LLAMADO'];

const buildDateTime = (fecha, hora) => {
  if (!fecha || !hora) return null;
  const isoDate = String(fecha).trim();
  const isoTime = String(hora).trim().slice(0, 5);
  const parsed = new Date(`${isoDate}T${isoTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const Dashboard = () => {
  const { user, permissions } = useContext(AuthContext);
  const { td } = useUI();
  const { loading: policyLoading, hasFeature, planCode } = useTenantPolicy();
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [errorResumen, setErrorResumen] = useState('');
  const [loadingPacienteInicio, setLoadingPacienteInicio] = useState(true);
  const [pacienteInicio, setPacienteInicio] = useState(null);
  const [citasPaciente, setCitasPaciente] = useState([]);
  const [errorPacienteInicio, setErrorPacienteInicio] = useState('');

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
        const msg = error?.response?.data?.detail || td('No se pudo cargar el dashboard operativo.');
        if (mounted) setErrorResumen(msg);
      } finally {
        if (mounted) setLoadingResumen(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [dashboardBasico, isOperativeUser, policyLoading, td]);

  useEffect(() => {
    let mounted = true;

    const loadPatientDashboard = async () => {
      if (isOperativeUser) {
        setLoadingPacienteInicio(false);
        return;
      }

      const userId = user?.user_id || user?.id;
      if (!userId) {
        setLoadingPacienteInicio(false);
        return;
      }

      try {
        setLoadingPacienteInicio(true);
        setErrorPacienteInicio('');
        const perfil = await patientService.getProfileByUserId(userId);
        if (!mounted) return;
        setPacienteInicio(perfil || null);

        if (!perfil?.id) {
          setCitasPaciente([]);
          return;
        }

        const dataCitas = await citasService.getAll({ paciente_id: perfil.id });
        if (!mounted) return;
        const list = Array.isArray(dataCitas) ? dataCitas : (dataCitas?.results || []);
        setCitasPaciente(list);
      } catch (error) {
        const msg = error?.response?.data?.detail || td('No se pudo cargar tu resumen personal.');
        if (mounted) {
          setErrorPacienteInicio(msg);
        }
      } finally {
        if (mounted) setLoadingPacienteInicio(false);
      }
    };

    loadPatientDashboard();
    return () => {
      mounted = false;
    };
  }, [isOperativeUser, td, user?.id, user?.user_id]);

  if (!isOperativeUser) {
    const sortedAppointments = [...citasPaciente].sort((a, b) => {
      const dateA = buildDateTime(a.fecha, a.hora_inicio);
      const dateB = buildDateTime(b.fecha, b.hora_inicio);
      return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
    });

    const now = new Date();
    const activeAppointments = sortedAppointments.filter((item) => PATIENT_ACTIVE_STATUSES.includes(item.estado));
    const upcomingAppointments = activeAppointments.filter((item) => {
      const date = buildDateTime(item.fecha, item.hora_inicio);
      return date && date.getTime() >= now.getTime();
    });
    const nextAppointment = upcomingAppointments[0] || null;
    const completedAppointments = sortedAppointments.filter((item) => item.estado === 'REALIZADA').length;
    const cancelledAppointments = sortedAppointments.filter((item) => ['CANCELADA', 'NO_ASISTIO'].includes(item.estado)).length;

    return (
      <div className="space-y-6">
        <PatientOnboarding />
        <div className="relative overflow-hidden rounded-3xl border border-cyan-200/60 bg-gradient-to-br from-cyan-600 via-sky-700 to-blue-900 p-6 md:p-8 text-white shadow-2xl">
          <div className="absolute -top-14 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-10 h-24 w-24 rounded-full bg-cyan-300/20 blur-xl" />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-100">{td('Portal del paciente')}</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">
                {td('Bienvenido')}, {user?.nombre || user?.name || td('Paciente')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-cyan-50/90 md:text-base">
                {td('Gestiona tus citas, revisa tu proximo turno y manten tu perfil listo para una atencion mas agil.')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard/citas/nueva"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-sky-800 shadow-md transition hover:-translate-y-0.5"
              >
                <FaCalendarPlus />
                {td('Nueva cita')}
              </Link>
              <Link
                to="/dashboard/citas"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
              >
                <FaClipboardList />
                {td('Ver mis citas')}
              </Link>
            </div>
          </div>
        </div>

        {errorPacienteInicio && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{errorPacienteInicio}</div>
        )}

        {loadingPacienteInicio ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`patient-skeleton-${idx}`} className="h-24 rounded-2xl border border-slate-200 bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">{td('Proximas citas')}</p>
                <p className="mt-2 text-3xl font-black text-cyan-900">{upcomingAppointments.length}</p>
                <p className="mt-1 text-xs text-cyan-700">{td('Confirmadas y pendientes por atender')}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{td('Citas realizadas')}</p>
                <p className="mt-2 text-3xl font-black text-emerald-900">{completedAppointments}</p>
                <p className="mt-1 text-xs text-emerald-700">{td('Historial completado')}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{td('Canceladas / inasistencia')}</p>
                <p className="mt-2 text-3xl font-black text-amber-900">{cancelledAppointments}</p>
                <p className="mt-1 text-xs text-amber-700">{td('Ultimos movimientos')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
              <div className="xl:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-900">{td('Tu proxima cita')}</h2>
                {nextAppointment ? (
                  <div className="mt-4 rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-5">
                    <p className="text-sm font-semibold text-slate-600">{td('Fecha')}:</p>
                    <p className="text-2xl font-black text-slate-900">
                      {nextAppointment.fecha} · {String(nextAppointment.hora_inicio || '').slice(0, 5)}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {td('Estado actual')}: <span className="font-bold">{nextAppointment.estado}</span>
                    </p>
                    <Link to="/dashboard/citas" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-900">
                      {td('Ver detalle completo')} <FaArrowRight />
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    {td('No tienes citas proximas. Agenda una nueva consulta para mantener tu seguimiento al dia.')}
                  </div>
                )}
              </div>

              <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-900">{td('Acciones recomendadas')}</h2>
                <div className="mt-4 space-y-2">
                  <Link to="/dashboard/citas/nueva" className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    <span className="flex items-center gap-2"><FaCalendarPlus className="text-cyan-600" />{td('Agendar nueva cita')}</span>
                    <FaArrowRight className="text-slate-400" />
                  </Link>
                  <Link to="/dashboard/citas" className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    <span className="flex items-center gap-2"><FaHeartbeat className="text-indigo-600" />{td('Revisar historial de citas')}</span>
                    <FaArrowRight className="text-slate-400" />
                  </Link>
                  <Link to="/dashboard/perfil" className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    <span className="flex items-center gap-2"><FaUserEdit className="text-emerald-600" />{td('Actualizar mi perfil')}</span>
                    <FaArrowRight className="text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>

            {pacienteInicio && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{td('Ficha paciente')}</p>
                    <h3 className="text-2xl font-black text-slate-900">
                      {pacienteInicio.nombre} {pacienteInicio.apellido}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800">
                    <FaCheckCircle />
                    {td('Perfil sincronizado')}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const kpi = resumen?.kpis_basicos || {};
  const av = resumen?.kpis_avanzados || {};
  const serie7 = resumen?.series_basicas?.ultimos_7_dias || [];
  const maxTotalSerie = Math.max(1, ...serie7.map((d) => Number(d.total || 0)));

  const cards = [
    { label: td('Citas hoy'), value: kpi.citas_hoy || 0, helper: td('Agenda diaria'), icon: FaCalendarCheck },
    { label: td('Realizadas hoy'), value: kpi.realizadas_hoy || 0, helper: td('Consultas cerradas'), icon: FaCheckCircle },
    { label: td('Pendientes hoy'), value: kpi.pendientes_hoy || 0, helper: td('Por gestionar'), icon: FaClock },
    { label: td('No asistio 30 dias'), value: kpi.no_asistio_30_dias || 0, helper: td('Riesgo operativo'), icon: FaUserClock },
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
            <p className="text-xs tracking-[0.2em] uppercase text-cyan-200">{td('Control center operativo')}</p>
            <h1 className="text-3xl md:text-4xl font-black mt-2">{td('Dashboard Clinico')}</h1>
            <p className="mt-2 text-slate-200">
              {td('Plan')}: <span className="font-bold">{planCode || 'N/A'}</span> | {td('Fecha corte')}:{' '}
              <span className="font-bold">{resumen?.periodo?.hoy || '-'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/20 px-4 py-3">
            <FaChartLine className="text-cyan-300" />
            <span className="text-sm font-semibold">{td('Ocupacion hoy')}: {formatPct(kpi.ocupacion_hoy_pct)}</span>
          </div>
        </div>
      </div>

      {!policyLoading && !dashboardBasico && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 p-5">
          <p className="font-extrabold">{td('Dashboard basico no incluido en tu plan')}</p>
          <p className="text-sm mt-1">{td('Activa el modulo dashboard_basico para visualizar metricas operativas.')}</p>
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
                  <h2 className="font-extrabold text-slate-900">{td('Tendencia ultimos 7 dias')}</h2>
                  <span className="text-xs text-slate-500">{td('Total de citas por dia')}</span>
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
                <h2 className="font-extrabold text-slate-900">{td('Acciones rapidas')}</h2>
                <div className="mt-4 space-y-2">
                  <Link to="/dashboard/admin/agenda" className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm">
                    <span className="flex items-center gap-2"><FaHospitalUser /> {td('Agenda')}</span>
                    <FaArrowUp className="rotate-45 text-slate-400" />
                  </Link>
                  <Link to="/dashboard/admin/citas" className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm">
                    <span className="flex items-center gap-2"><FaStethoscope /> {td('Gestion de Citas')}</span>
                    <FaArrowUp className="rotate-45 text-slate-400" />
                  </Link>
                  <Link to="/dashboard/admin/pacientes" className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm">
                    <span className="flex items-center gap-2"><FaLayerGroup /> {td('Pacientes')}</span>
                    <FaArrowUp className="rotate-45 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-slate-900">{td('Dashboard avanzado')}</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${dashboardAvanzado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {dashboardAvanzado ? td('Activo') : td('No incluido')}
                </span>
              </div>

              {dashboardAvanzado ? (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs text-slate-500">{td('No-show 30 dias')}</p>
                    <p className="text-2xl font-black text-slate-900">{formatPct(av.no_show_rate_30_dias_pct)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs text-slate-500">{td('Completion 30 dias')}</p>
                    <p className="text-2xl font-black text-slate-900">{formatPct(av.completion_rate_30_dias_pct)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs text-slate-500">{td('Top servicios')}</p>
                    <p className="text-2xl font-black text-slate-900">{(av.top_servicios_30_dias || []).length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs text-slate-500">{td('Top profesionales')}</p>
                    <p className="text-2xl font-black text-slate-900">{(av.top_profesionales_30_dias || []).length}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  {td('Tu plan actual muestra solo metricas base. Activa dashboard_avanzado para KPIs avanzados y comparativos.')}
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

