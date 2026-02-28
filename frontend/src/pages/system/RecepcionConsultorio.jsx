import React, { useState, useEffect, useMemo, useRef } from 'react';
import { citasService } from '../../services/citasService';
import { configService } from '../../services/configService'; // Importamos configuración para los estados
import Swal from 'sweetalert2';
import * as FaIcons from 'react-icons/fa'; // Importamos todos los iconos para renderizado dinámico
import {
    FaUserCheck, FaNotesMedical, FaHistory, FaClock, FaSave,
    FaTimes, FaStethoscope, FaUserInjured, FaCalendarAlt,
    FaChevronLeft, FaChevronRight, FaSearch, FaFilter, FaWalking
} from 'react-icons/fa';

const RecepcionConsultorio = () => {
    // --- ESTADOS ---
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [citas, setCitas] = useState([]);
    const [workflow, setWorkflow] = useState([]); // Nuevo: Motor de flujos
    const [loading, setLoading] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS');

    // Referencia para el input de fecha nativo
    const dateInputRef = useRef(null);

    // Estado del Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [citaSeleccionada, setCitaSeleccionada] = useState(null);
    const [historialPaciente, setHistorialPaciente] = useState([]);
    const [notaRecepcion, setNotaRecepcion] = useState("");
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    // --- CARGA INICIAL Y CONFIGURACIÓN ---
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const config = await configService.getConfig();
                if (config && config.workflow_citas) setWorkflow(config.workflow_citas);
            } catch (error) {
                console.error("Error cargando configuración de estados", error);
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        cargarCitas();
    }, [selectedDate]);

    const cargarCitas = async () => {
        setLoading(true);
        try {
            const data = await citasService.getAll({
                fecha: selectedDate,
                ordering: 'hora_inicio'
            });
            setCitas(data);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar la agenda', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE FILTRADO Y ESTADÍSTICAS ---
    const citasFiltradas = useMemo(() => {
        return citas.filter(c => {
            const matchText = (c.paciente_nombre || '').toLowerCase().includes(filterText.toLowerCase()) ||
                (c.paciente_doc || '').includes(filterText);

            let matchStatus = true;
            if (statusFilter === 'PENDIENTES') matchStatus = ['PENDIENTE', 'ACEPTADA'].includes(c.estado);
            if (statusFilter === 'EN_SALA') matchStatus = c.estado === 'EN_SALA';
            if (statusFilter === 'FINALIZADOS') matchStatus = ['REALIZADA', 'CANCELADA', 'NO_ASISTIO', 'RECHAZADA', 'FACTURACION'].includes(c.estado);

            return matchText && matchStatus;
        });
    }, [citas, filterText, statusFilter]);

    const stats = useMemo(() => ({
        total: citas.length,
        pendientes: citas.filter(c => ['PENDIENTE', 'ACEPTADA'].includes(c.estado)).length,
        enSala: citas.filter(c => c.estado === 'EN_SALA').length,
        finalizadas: citas.filter(c => ['REALIZADA', 'FACTURACION'].includes(c.estado)).length
    }), [citas]);

    // --- MANEJO DE FECHAS ---
    const cambiarFecha = (dias) => {
        const d = new Date(selectedDate + "T12:00:00");
        d.setDate(d.getDate() + dias);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const irAHoy = () => {
        const hoy = new Date();
        const offset = hoy.getTimezoneOffset();
        const hoyLocal = new Date(hoy.getTime() - (offset * 60 * 1000));
        setSelectedDate(hoyLocal.toISOString().split('T')[0]);
    };

    const abrirCalendario = () => {
        if (dateInputRef.current?.showPicker) dateInputRef.current.showPicker();
    };

    // --- RENDERIZADO DINÁMICO ---
    const DynamicIcon = ({ name, className }) => {
        const IconComponent = FaIcons[name] || FaIcons.FaCircle;
        return <IconComponent className={className} />;
    };

    const getEstadoBadge = (estado) => {
        const config = workflow.find(s => s.slug === estado);
        const color = config?.color || '#6B7280';
        return (
            <span
                style={{ borderColor: color, color: color, backgroundColor: `${color}15` }}
                className="px-3 py-1 rounded-full text-[10px] uppercase font-bold border tracking-wider"
            >
                {config?.label || estado.replace(/_/g, ' ')}
            </span>
        );
    };

    const calcularEdad = (fechaNacimiento) => {
        if (!fechaNacimiento) return "S/D";
        const hoy = new Date();
        const nacimiento = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
        return `${edad} años`;
    };

    // --- ACCIONES ---
    const handleAtender = async (cita) => {
        setCitaSeleccionada(cita);
        setNotaRecepcion(cita.nota_interna || "");
        setModalOpen(true);
        setLoadingHistorial(true);
        try {
            const historial = await citasService.getHistorialPaciente(cita.paciente_id);
            setHistorialPaciente(historial.filter(h => h.id !== cita.id));
        } catch (error) {
            console.error("Error cargando historial", error);
        } finally {
            setLoadingHistorial(false);
        }
    };

    const ejecutarAccionRapida = async (cita, accion) => {
        // Si la acción requiere notas médicas o motivos, usamos el modal detallado
        if (accion.requiere_nota_medica || accion.requiere_motivo) {
            handleAtender(cita);
            return;
        }

        const { isConfirmed } = await Swal.fire({
            title: `¿Pasar a ${accion.label}?`,
            text: `Se actualizará el estado de ${cita.paciente_nombre}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, actualizar',
            confirmButtonColor: '#4f46e5'
        });

        if (isConfirmed) {
            try {
                await citasService.updateEstado(cita.id, { estado: accion.target });
                Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1000, showConfirmButton: false });
                cargarCitas();
            } catch (error) {
                Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
            }
        }
    };

    const confirmarIngreso = async () => {
        if (!citaSeleccionada) return;
        try {
            await citasService.updateEstado(citaSeleccionada.id, {
                estado: 'EN_SALA',
                nota_interna: notaRecepcion
            });
            Swal.fire({ icon: 'success', title: 'Paciente en Sala', timer: 1500, showConfirmButton: false });
            setModalOpen(false);
            cargarCitas();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo procesar el ingreso', 'error');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50">

            {/* 1. HEADER & KPI CARDS */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 shadow-sm shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 tracking-tight">
                            <FaUserInjured className="text-indigo-600" /> Recepción de Pacientes
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 font-medium">Gestión de flujo y admisión diaria.</p>
                    </div>

                    <div className="flex gap-3 mt-4 md:mt-0">
                        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex flex-col items-center">
                            <span className="text-2xl font-black text-blue-700 leading-none">{stats.total}</span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase">Total</span>
                        </div>
                        <div className="bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-100 flex flex-col items-center">
                            <span className="text-2xl font-black text-yellow-700 leading-none">{stats.pendientes}</span>
                            <span className="text-[10px] font-bold text-yellow-500 uppercase">Pendientes</span>
                        </div>
                        <div className="bg-purple-50 px-4 py-2 rounded-xl border border-purple-100 flex flex-col items-center">
                            <span className="text-2xl font-black text-purple-700 leading-none">{stats.enSala}</span>
                            <span className="text-[10px] font-bold text-purple-400 uppercase">En Sala</span>
                        </div>
                    </div>
                </div>

                {/* BARRA DE CONTROL */}
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={() => cambiarFecha(-1)} className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition active:scale-95"><FaChevronLeft /></button>

                        <div onClick={abrirCalendario} className="relative flex flex-col items-center px-4 py-1 border-x border-gray-100 cursor-pointer hover:bg-indigo-50/50 transition rounded group min-w-[140px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                {new Date(selectedDate + "T12:00:00").toLocaleDateString('es-ES', { weekday: 'long' })}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-gray-800">{selectedDate}</span>
                                <FaCalendarAlt className="text-indigo-500 text-xs group-hover:scale-110 transition-transform" />
                            </div>
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="absolute pointer-events-none opacity-0 w-0 h-0"
                            />
                        </div>

                        <button onClick={() => cambiarFecha(1)} className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition active:scale-95"><FaChevronRight /></button>
                        <button onClick={irAHoy} className="text-xs font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-md ml-1 border border-indigo-100 transition duration-200">HOY</button>
                    </div>

                    <div className="flex flex-1 gap-3 w-full lg:w-auto">
                        <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                            {['TODOS', 'PENDIENTES', 'EN_SALA', 'FINALIZADOS'].map(st => (
                                <button key={st} onClick={() => setStatusFilter(st)} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === st ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>{st.replace('_', ' ')}</button>
                            ))}
                        </div>
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                            <input type="text" placeholder="Buscar paciente..." className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. TABLA DE PACIENTES */}
            <div className="flex-1 p-6 overflow-hidden">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col overflow-hidden">
                    <div className="overflow-auto flex-1 scrollbar-thin">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold sticky top-0 z-10 shadow-sm border-b border-gray-200 tracking-wider">
                                <tr>
                                    <th className="p-4 w-24 text-center">Hora</th>
                                    <th className="p-4">Paciente</th>
                                    <th className="p-4">Doctor / Servicio</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-center w-48">Gestión de Flujo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div></td></tr>
                                ) : citasFiltradas.length === 0 ? (
                                    <tr><td colSpan="5" className="p-20 text-center text-gray-400 italic bg-gray-50/30">No hay citas registradas.</td></tr>
                                ) : (
                                    citasFiltradas.map(cita => {
                                        // Obtener acciones dinámicas del Workflow
                                        const configEstado = workflow.find(w => w.slug === cita.estado);
                                        const accionesDisponibles = configEstado?.acciones || [];

                                        return (
                                            <tr key={cita.id} className="hover:bg-indigo-50/40 transition group">
                                                <td className="p-4 text-center border-r border-gray-100 bg-gray-50/30">
                                                    <span className="font-mono font-black text-gray-700 text-lg block">{cita.hora_inicio?.slice(0, 5)}</span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-white border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-sm">
                                                            {cita.paciente_nombre?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800 text-base">{cita.paciente_nombre}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{cita.paciente_doc} • {calcularEdad(cita.paciente_fecha_nacimiento)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-gray-800 font-bold text-sm">{cita.profesional_nombre}</div>
                                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold">{cita.servicio_nombre}</span>
                                                </td>
                                                <td className="p-4 text-center">{getEstadoBadge(cita.estado)}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* BOTÓN PRINCIPAL DE INGRESO/NOTA */}
                                                        <button
                                                            onClick={() => handleAtender(cita)}
                                                            className={`p-2 rounded-lg transition-all border shadow-sm ${cita.estado === 'PENDIENTE' || cita.estado === 'ACEPTADA' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                                                            title="Admitir o Editar Nota"
                                                        >
                                                            <FaNotesMedical size={16} />
                                                        </button>

                                                        {/* BOTONES DINÁMICOS DEL WORKFLOW */}
                                                        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                                                            {accionesDisponibles.map((acc, i) => {
                                                                const btnStyles = {
                                                                    blue: 'text-blue-600 hover:bg-blue-600 hover:text-white',
                                                                    success: 'text-green-600 hover:bg-green-600 hover:text-white',
                                                                    danger: 'text-red-600 hover:bg-red-600 hover:text-white',
                                                                    warning: 'text-orange-600 hover:bg-orange-600 hover:text-white',
                                                                    purple: 'text-purple-600 hover:bg-purple-600 hover:text-white',
                                                                    teal: 'text-teal-600 hover:bg-teal-600 hover:text-white',
                                                                    indigo: 'text-indigo-600 hover:bg-indigo-600 hover:text-white',
                                                                    gray: 'text-gray-600 hover:bg-gray-600 hover:text-white',
                                                                };
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => ejecutarAccionRapida(cita, acc)}
                                                                        className={`w-8 h-8 flex items-center justify-center rounded-md bg-white border border-gray-200 transition-all ${btnStyles[acc.tipo] || 'text-gray-500'}`}
                                                                        title={acc.label}
                                                                    >
                                                                        <DynamicIcon name={acc.icon || 'FaArrowRight'} className="text-sm" />
                                                                    </button>
                                                                );
                                                            })}
                                                            {accionesDisponibles.length === 0 && (
                                                                <span className="text-[9px] text-gray-400 px-2 font-black uppercase italic py-2">Fin</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODAL DE INGRESO --- */}
            {modalOpen && citaSeleccionada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white p-5 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2"><FaUserCheck /> {citaSeleccionada.estado === 'EN_SALA' ? 'Editar Ingreso' : 'Ingreso a Consultorio'}</h2>
                                <p className="text-sm text-indigo-200 opacity-90">{citaSeleccionada.paciente_nombre}</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition text-white"><FaTimes size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                                {/* COLUMNA IZQUIERDA: DATOS PACIENTE Y NOTA */}
                                <div className="lg:col-span-5 space-y-4 flex flex-col">
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
                                        <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                                            <FaUserInjured size={120} />
                                        </div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paciente</label>
                                        <div className="text-2xl font-black text-gray-800 mt-1">{citaSeleccionada.paciente_nombre}</div>
                                        <div className="text-sm text-gray-500 mb-4 font-mono">{citaSeleccionada.paciente_doc}</div>

                                        <div className="flex gap-2">
                                            <div className="bg-indigo-50 px-3 py-1.5 rounded-lg text-xs text-indigo-800 font-bold border border-indigo-100 flex items-center gap-1">
                                                🎂 {citaSeleccionada.paciente_fecha_nacimiento
                                                    ? calcularEdad(citaSeleccionada.paciente_fecha_nacimiento)
                                                    : "Edad N/A"}
                                            </div>
                                            <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs text-gray-600 border border-gray-200 font-bold">
                                                {citaSeleccionada.servicio_nombre}
                                            </div>
                                        </div>
                                    </div>

                                    {citaSeleccionada.nota && (
                                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm italic text-gray-700">
                                            <label className="text-[10px] font-black text-orange-800 uppercase block mb-1">Motivo Cita:</label>
                                            "{citaSeleccionada.nota}"
                                        </div>
                                    )}

                                    <div className="bg-white p-1 rounded-xl border border-indigo-200 shadow-md ring-4 ring-indigo-50 flex-1 flex flex-col">
                                        <div className="bg-indigo-50 p-3 rounded-t-lg border-b border-indigo-100 font-bold text-sm text-indigo-900 flex items-center gap-2">
                                            <FaNotesMedical /> Nota de Recepción / Triage
                                        </div>
                                        <textarea
                                            value={notaRecepcion}
                                            onChange={(e) => setNotaRecepcion(e.target.value)}
                                            disabled={['REALIZADA', 'CANCELADA', 'RECHAZADA'].includes(citaSeleccionada.estado)}
                                            className="w-full p-4 text-sm outline-none resize-none flex-1 text-gray-700 bg-transparent placeholder-gray-400"
                                            placeholder="Ingrese signos vitales, pago de copago o notas administrativas..."
                                            autoFocus
                                        ></textarea>
                                    </div>
                                </div>

                                {/* COLUMNA DERECHA: HISTORIAL */}
                                <div className="lg:col-span-7 flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50 p-3 border-b font-black text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <FaHistory /> Historial Clínico Reciente
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
                                        {loadingHistorial ? (
                                            <div className="p-10 text-center animate-pulse text-gray-400">Consultando base de datos...</div>
                                        ) : historialPaciente.length === 0 ? (
                                            <p className="p-10 text-center text-gray-300 italic">Sin registros de citas previas.</p>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {historialPaciente.map(hist => (
                                                    <div key={hist.id} className="p-4 hover:bg-gray-50 transition border-b border-gray-50">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="font-bold text-gray-700 text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                                {hist.fecha}
                                                            </span>
                                                            <span className={`text-[10px] font-bold uppercase ${hist.estado === 'REALIZADA' ? 'text-green-600' : 'text-gray-400'}`}>
                                                                {hist.estado}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm font-bold text-indigo-900">{hist.profesional_nombre}</div>

                                                        {/* ✅ CAMBIO MÍNIMO (alternativa 2): usar el string nuevo del serializer */}
                                                        <div className="text-xs text-gray-500 italic bg-yellow-50 p-2 rounded border border-yellow-100 mt-2">
                                                            "{hist.nota_medica_contenido || "Sin notas registradas."}"
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                            <button onClick={() => setModalOpen(false)} className="px-5 py-2 rounded-lg text-gray-600 font-bold hover:bg-gray-200 transition text-sm">
                                Cerrar
                            </button>
                            {!['REALIZADA', 'CANCELADA', 'NO_ASISTIO', 'RECHAZADA'].includes(citaSeleccionada.estado) && (
                                <button
                                    onClick={confirmarIngreso}
                                    className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg flex items-center gap-2 transform active:scale-95 transition text-sm"
                                >
                                    <FaSave /> {citaSeleccionada.estado === 'EN_SALA' ? 'Actualizar Datos' : 'Confirmar Ingreso'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecepcionConsultorio;