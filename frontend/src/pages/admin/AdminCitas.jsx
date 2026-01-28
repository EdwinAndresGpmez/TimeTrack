import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { citasService } from '../../services/citasService';
import Swal from 'sweetalert2';
import { 
    FaCalendarCheck, FaCheckCircle, FaTimesCircle, FaClock, 
    FaFilter, FaSearch, FaBan, FaUserClock, FaHourglassHalf,
    FaCalendarPlus, FaMagic
} from 'react-icons/fa';

const AdminCitas = () => {
    // --- ESTADOS ---
    const [activeTab, setActiveTab] = useState('PENDIENTE');
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // --- CONFIGURACIÓN DE PESTAÑAS ---
    const tabs = [
        { id: 'PENDIENTE', label: 'Por Revisar', icon: <FaClock/>, color: 'text-yellow-600 border-yellow-600' },
        { id: 'ACEPTADA', label: 'Aceptadas', icon: <FaCheckCircle/>, color: 'text-green-600 border-green-600' },
        { id: 'EN_SALA', label: 'En Sala', icon: <FaHourglassHalf/>, color: 'text-indigo-600 border-indigo-600' },
        { id: 'REALIZADA', label: 'Realizadas', icon: <FaCalendarCheck/>, color: 'text-blue-600 border-blue-600' },
        { id: 'CANCELADA', label: 'Canceladas', icon: <FaBan/>, color: 'text-red-600 border-red-600' },
        { id: 'NO_ASISTIO', label: 'No Asistió', icon: <FaUserClock/>, color: 'text-gray-600 border-gray-600' },
    ];

    useEffect(() => {
        cargarCitas();
    }, [activeTab, filtroFecha]);

    const cargarCitas = async () => {
        setLoading(true);
        try {
            const params = { estado: activeTab };
            if (filtroFecha) params.fecha = filtroFecha;

            const data = await citasService.getAll(params);
            const lista = Array.isArray(data) ? data : (data.results || []);
            setCitas(lista);

        } catch (error) {
            console.error("Error cargando citas:", error);
            if (!error.response || error.response.status !== 400) {
                Swal.fire('Error', 'No se pudieron obtener las citas.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const cambiarEstado = async (cita, nuevoEstado) => {
        let accionTexto = `¿Cambiar estado a ${nuevoEstado}?`;
        if (nuevoEstado === 'EN_SALA') accionTexto = "¿El paciente ya llegó a la sala de espera?";
        if (nuevoEstado === 'REALIZADA') accionTexto = "¿Confirmar que la cita fue realizada?";
        
        const { isConfirmed } = await Swal.fire({
            title: accionTexto,
            text: `Paciente: ${cita.paciente_nombre || 'Desconocido'}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3b82f6'
        });

        if (isConfirmed) {
            try {
                await citasService.updateEstado(cita.id, nuevoEstado);
                Swal.fire({
                    title: 'Actualizado',
                    text: 'El estado de la cita ha sido modificado.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                cargarCitas(); 
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
            }
        }
    };

    const citasFiltradas = citas.filter(c => 
        (c.paciente_nombre?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
        (c.profesional_nombre?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
        (c.paciente_doc?.toString().includes(busqueda))
    );

    return (
        <div className="max-w-7xl mx-auto p-4 relative">
            
            {/* --- CABECERA CON BOTÓN LLAMATIVO --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-gradient-to-r from-gray-50 to-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tight">Administración de Citas</h1>
                    <p className="text-gray-500 font-medium mt-1">Gestiona la agenda médica y estados de pacientes.</p>
                </div>

                <Link 
                    to="/dashboard/agendar-admin" 
                    className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 overflow-hidden active:scale-95"
                >
                    {/* Efecto de brillo animado */}
                    <div className="absolute inset-0 w-full h-full transition-all duration-300 scale-0 group-hover:scale-100 group-hover:bg-white/10 rounded-2xl"></div>
                    
                    <FaCalendarPlus className="mr-3 text-xl animate-bounce" />
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-[10px] uppercase tracking-widest opacity-80 font-black">Agendamiento</span>
                        <span className="text-lg">Nueva Cita Admin</span>
                    </div>
                </Link>
            </div>

            {/* BARRA DE HERRAMIENTAS */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between border border-gray-100">
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <FaFilter className="text-gray-400"/>
                        <span className="text-sm font-bold text-gray-600 uppercase tracking-tighter">Fecha:</span>
                        <input 
                            type="date" 
                            value={filtroFecha} 
                            onChange={(e) => setFiltroFecha(e.target.value)}
                            className="bg-transparent outline-none text-sm text-gray-700 font-medium"
                        />
                        {filtroFecha && (
                            <button 
                                onClick={() => setFiltroFecha('')} 
                                className="text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded-md font-black hover:bg-red-100 transition-colors uppercase"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <FaSearch className="absolute left-3 top-3 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="Buscar por documento o nombre..." 
                        className="pl-10 pr-4 py-2 border rounded-xl text-sm w-80 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {/* TABS (Pestañas de Estados) */}
            <div className="flex overflow-x-auto bg-gray-50 rounded-t-xl border-t border-x border-gray-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-4 font-bold flex items-center gap-2 whitespace-nowrap transition-all text-xs uppercase tracking-widest
                            ${activeTab === tab.id 
                                ? `border-b-4 ${tab.color.replace('text', 'border')} ${tab.color} bg-white shadow-sm` 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="bg-white shadow-2xl rounded-b-xl overflow-hidden border border-gray-200 min-h-[450px]">
                {loading ? (
                    <div className="p-24 text-center text-gray-400 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <span className="font-bold uppercase tracking-widest text-xs">Sincronizando agenda...</span>
                    </div>
                ) : citasFiltradas.length === 0 ? (
                    <div className="p-24 text-center">
                        <div className="text-gray-300 mb-4 flex justify-center"><FaCalendarCheck size={48}/></div>
                        <p className="text-gray-400 italic font-medium">No se encontraron citas en este estado.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm leading-normal">
                            <thead className="bg-gray-800 text-white uppercase font-black text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-6 py-4 text-left">Documento</th>
                                    <th className="px-6 py-4 text-left">Paciente</th>
                                    <th className="px-6 py-4 text-left">Profesional</th>
                                    <th className="px-6 py-4 text-left">Servicio</th>
                                    <th className="px-6 py-4 text-left">Día / Hora</th>
                                    <th className="px-6 py-4 text-left">Sede</th>
                                    <th className="px-6 py-4 text-center w-48">Gestión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {citasFiltradas.map(cita => (
                                    <tr key={cita.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
                                                {cita.paciente_doc || '---'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-gray-900 uppercase text-xs">
                                                {cita.paciente_nombre || 'Desconocido'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-semibold">
                                            {cita.profesional_nombre || 'No asignado'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black border border-blue-100 uppercase tracking-tighter shadow-sm">
                                                {cita.servicio_nombre || 'Consulta'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800 flex items-center gap-1">
                                                <FaClock className="text-gray-300 text-[10px]"/>
                                                {cita.fecha}
                                            </div>
                                            <div className="text-[11px] font-black text-blue-600 mt-0.5">
                                                {(cita.hora_inicio || '').slice(0,5)} - {(cita.hora_fin || '').slice(0,5)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-500 text-[11px] font-bold italic">
                                                {cita.lugar_nombre || 'Sede Principal'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                                                {activeTab === 'PENDIENTE' && (
                                                    <>
                                                        <button onClick={() => cambiarEstado(cita, 'ACEPTADA')} className="btn-icon bg-green-50 text-green-600 hover:bg-green-600 hover:text-white border border-green-200 shadow-sm" title="Aceptar Cita"><FaCheckCircle/></button>
                                                        <button onClick={() => cambiarEstado(cita, 'CANCELADA')} className="btn-icon bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 shadow-sm" title="Rechazar Cita"><FaTimesCircle/></button>
                                                    </>
                                                )}
                                                {activeTab === 'ACEPTADA' && (
                                                    <>
                                                        <button onClick={() => cambiarEstado(cita, 'EN_SALA')} className="btn-icon bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 shadow-sm" title="Paciente Llegó (Sala de Espera)"><FaHourglassHalf/></button>
                                                        <button onClick={() => cambiarEstado(cita, 'NO_ASISTIO')} className="btn-icon bg-gray-50 text-gray-500 hover:bg-gray-600 hover:text-white border border-gray-300 shadow-sm" title="Marcar Inasistencia"><FaUserClock/></button>
                                                        <button onClick={() => cambiarEstado(cita, 'CANCELADA')} className="btn-icon bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-200 shadow-sm" title="Cancelar Cita"><FaBan/></button>
                                                    </>
                                                )}
                                                {activeTab === 'EN_SALA' && (
                                                    <>
                                                        <button onClick={() => cambiarEstado(cita, 'REALIZADA')} className="btn-icon bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 shadow-sm" title="Atender / Finalizar Cita"><FaCalendarCheck/></button>
                                                        <button onClick={() => cambiarEstado(cita, 'CANCELADA')} className="btn-icon bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-200 shadow-sm" title="Cancelar Cita"><FaBan/></button>
                                                    </>
                                                )}
                                                {['REALIZADA', 'CANCELADA', 'RECHAZADA', 'NO_ASISTIO'].includes(activeTab) && (
                                                    <span className="text-[10px] font-black text-gray-300 uppercase italic tracking-widest">
                                                        Finalizada
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- BOTÓN FLOTANTE MÁGICO (FAB) --- */}
            <Link 
                to="/dashboard/agendar-admin" 
                className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:rotate-12 transition-all duration-300 group z-50 border-4 border-white"
                title="Agendamiento Rápido"
            >
                <FaMagic className="text-2xl" />
                <span className="absolute right-20 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-gray-700">
                    Agendar para un Paciente ✨
                </span>
            </Link>
            
            <style>{`
                .btn-icon { width: 32px; height: 32px; border-radius: 8px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; }
                .btn-icon:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                .btn-icon:active { transform: translateY(0); }
                
                /* Animación suave para la entrada de la tabla */
                tbody tr { animation: fadeIn 0.3s ease-in-out; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AdminCitas;