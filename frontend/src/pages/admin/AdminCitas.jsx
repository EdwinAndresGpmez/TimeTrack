import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { citasService } from '../../services/citasService';
import { configService } from '../../services/configService'; 
import Swal from 'sweetalert2';
import * as FaIcons from 'react-icons/fa';

const AdminCitas = () => {
    const [workflow, setWorkflow] = useState([]);
    const [activeTab, setActiveTab] = useState('');
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                const config = await configService.getConfig();
                if (config && config.workflow_citas) {
                    setWorkflow(config.workflow_citas);
                    if (config.workflow_citas.length > 0) {
                        setActiveTab(config.workflow_citas[0].slug);
                    }
                }
            } catch (error) {
                console.error("Error cargando workflow", error);
            }
        };
        init();
    }, []);

    const cargarCitas = useCallback(async () => {
        if (!activeTab) return;
        setLoading(true);
        try {
            const params = { estado: activeTab };
            if (filtroFecha) params.fecha = filtroFecha;
            const data = await citasService.getAll(params);
            const lista = Array.isArray(data) ? data : (data.results || []);
            setCitas(lista);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [activeTab, filtroFecha]);

    useEffect(() => {
        cargarCitas();
    }, [cargarCitas]);

    const DynamicIcon = ({ name, className }) => {
        const IconComponent = FaIcons[name] || FaIcons.FaCircle;
        return <IconComponent className={className} />;
    };

    // HELPER: Obtener nombre de forma segura (Frontend defensivo)
    const getPacienteNombre = (cita) => {
        if (cita.paciente_nombre && cita.paciente_nombre !== "Desconocido") {
            return cita.paciente_nombre;
        }
        // Si el backend envió "Desconocido", intentamos ver si vienen los campos por separado
        if (cita.paciente?.nombre) {
            return `${cita.paciente.nombre} ${cita.paciente.apellido || ''}`;
        }
        return "Sin Identificar";
    };

    const ejecutarAccion = async (cita, accion) => {
        try {
            let payload = { estado: accion.target };
            let confirmar = false;
            const nombrePaciente = getPacienteNombre(cita);

            if (accion.requiere_nota_medica) {
                const { value: notas } = await Swal.fire({
                    title: accion.label,
                    html: `<div class="text-left text-sm text-gray-600 mb-2">Paciente: <b>${nombrePaciente}</b></div>`,
                    input: 'textarea',
                    inputPlaceholder: 'Notas clínicas obligatorias...',
                    showCancelButton: true,
                    confirmButtonText: 'Guardar',
                    confirmButtonColor: '#2563EB',
                    inputValidator: (val) => !val && '¡Campo obligatorio!'
                });
                if (!notas) return;
                payload.notas_medicas = notas;
                payload.fecha_fin_real = new Date().toISOString();
                confirmar = true;
            } 
            else if (accion.requiere_motivo) {
                const { value: motivo } = await Swal.fire({
                    title: `¿${accion.label}?`,
                    text: 'Por favor indique el motivo:',
                    input: 'text',
                    showCancelButton: true,
                    confirmButtonText: 'Confirmar',
                    confirmButtonColor: '#EF4444',
                    inputValidator: (val) => !val && '¡Motivo obligatorio!'
                });
                if (!motivo) return;
                payload.nota_interna = motivo;
                confirmar = true;
            } 
            else {
                const { isConfirmed } = await Swal.fire({
                    title: `¿${accion.label}?`,
                    text: `La cita pasará a estado: ${accion.target}`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, continuar',
                    confirmButtonColor: '#3b82f6'
                });
                confirmar = isConfirmed;
            }

            if (confirmar) {
                await citasService.updateEstado(cita.id, payload);
                Swal.fire({ title: 'Actualizado', icon: 'success', timer: 1000, showConfirmButton: false });
                cargarCitas();
            }
        } catch (error) {
            Swal.fire('Error', error.response?.data?.detail || 'No se pudo ejecutar la acción', 'error');
        }
    };

    const currentStateConfig = workflow.find(s => s.slug === activeTab);

    const citasFiltradas = citas.filter(c => {
        const nombre = getPacienteNombre(c).toLowerCase();
        const prof = (c.profesional_nombre?.toLowerCase() || '');
        const doc = (c.paciente_doc?.toString() || '');
        const search = busqueda.toLowerCase();
        return nombre.includes(search) || prof.includes(search) || doc.includes(search);
    });

    const getColorStyle = (colorValue, isActive) => {
        const legacyColors = {
            yellow: '#EAB308', green: '#16A34A', indigo: '#4F46E5',
            blue: '#2563EB', red: '#DC2626', gray: '#6B7280', warning: '#F97316'
        };
        const hex = legacyColors[colorValue] || colorValue || '#6B7280';
        return isActive 
            ? { borderBottom: `4px solid ${hex}`, color: hex, backgroundColor: 'white' }
            : { color: '#9CA3AF' }; 
    };

    return (
        <div className="max-w-7xl mx-auto p-4 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-gradient-to-r from-gray-50 to-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tight">Control de Citas</h1>
                    <p className="text-gray-500 font-medium mt-1">Gestión de flujo de pacientes e ingresos.</p>
                </div>
                <Link to="/dashboard/agendar-admin" className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-xl active:scale-95">
                    <FaIcons.FaCalendarPlus className="mr-3 text-xl animate-bounce" />
                    <span className="text-lg">Nueva Cita</span>
                </Link>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between border border-gray-100">
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <FaIcons.FaFilter className="text-gray-400"/>
                        <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="bg-transparent outline-none text-sm text-gray-700 font-medium" />
                        {filtroFecha && <button onClick={() => setFiltroFecha('')} className="text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded-md font-black hover:bg-red-100 uppercase">X</button>}
                    </div>
                </div>
                <div className="relative">
                    <FaIcons.FaSearch className="absolute left-3 top-3 text-gray-400"/>
                    <input type="text" placeholder="Buscar paciente..." className="pl-10 pr-4 py-2 border rounded-xl text-sm w-80 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
            </div>

            {/* Pestañas */}
            <div className="flex overflow-x-auto bg-gray-50 rounded-t-xl border-t border-x border-gray-200 scrollbar-hide">
                {workflow.map(state => (
                    <button
                        key={state.slug}
                        onClick={() => setActiveTab(state.slug)}
                        style={getColorStyle(state.color, activeTab === state.slug)}
                        className={`px-6 py-4 font-bold flex items-center gap-2 whitespace-nowrap transition-all text-xs uppercase tracking-widest ${activeTab !== state.slug ? 'hover:text-gray-600 hover:bg-gray-100' : 'shadow-sm'}`}
                    >
                        <DynamicIcon name={state.icon} /> {state.label}
                    </button>
                ))}
            </div>

            {/* Tabla */}
            <div className="bg-white shadow-2xl rounded-b-xl overflow-hidden border border-gray-200 min-h-[450px]">
                {loading ? (
                    <div className="p-24 text-center text-gray-400 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <span className="font-bold uppercase tracking-widest text-xs">Cargando datos...</span>
                    </div>
                ) : citasFiltradas.length === 0 ? (
                    <div className="p-24 text-center">
                        <div className="text-gray-300 mb-4 flex justify-center"><FaIcons.FaCalendarCheck size={48}/></div>
                        <p className="text-gray-400 italic font-medium">No se encontraron citas.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm leading-normal">
                            <thead className="bg-gray-800 text-white uppercase font-black text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-6 py-4 text-left">Hora</th>
                                    <th className="px-6 py-4 text-left">Paciente</th>
                                    <th className="px-6 py-4 text-left">Profesional</th>
                                    <th className="px-6 py-4 text-left">Detalle</th>
                                    <th className="px-6 py-4 text-center w-48">Gestión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {citasFiltradas.map(cita => (
                                    <tr key={cita.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800 flex items-center gap-1"><FaIcons.FaClock className="text-gray-400 text-[10px]"/>{(cita.hora_inicio || '').slice(0,5)}</div>
                                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">{cita.fecha}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* CAMBIO AQUÍ: Usamos la función de nombre seguro */}
                                            <div className="font-black text-gray-900 uppercase text-xs">
                                                {getPacienteNombre(cita)}
                                            </div>
                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{cita.paciente_doc}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-semibold text-xs">
                                            <div className="flex items-center gap-2"><FaIcons.FaStethoscope className="text-teal-500"/>{cita.profesional_nombre || 'No asignado'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black border border-blue-100 uppercase tracking-tighter">{cita.servicio_nombre}</span>
                                            <div className="text-[10px] text-gray-400 mt-1 italic">{cita.lugar_nombre}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                                                {currentStateConfig?.acciones?.map((accion, idx) => {
                                                    const btnColors = {
                                                        blue: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white',
                                                        success: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-600 hover:text-white',
                                                        danger: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-600 hover:text-white',
                                                        warning: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-600 hover:text-white',
                                                        indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white',
                                                        purple: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-600 hover:text-white',
                                                        pink: 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-600 hover:text-white',
                                                        teal: 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-600 hover:text-white',
                                                        gray: 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-600 hover:text-white',
                                                        dark: 'bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-900 hover:text-white'
                                                    };
                                                    return (
                                                        <button key={idx} onClick={() => ejecutarAccion(cita, accion)} className={`btn-icon border ${btnColors[accion.tipo] || btnColors.gray}`} title={accion.label}>
                                                            <DynamicIcon name={accion.icon || 'FaArrowRight'} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <style>{`
                .btn-icon { width: 34px; height: 34px; border-radius: 10px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; font-size: 14px; }
                .btn-icon:hover { transform: translateY(-2px); box-shadow: 0 4px 10px -2px rgba(0,0,0,0.1); }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};
export default AdminCitas;