import React, { useEffect, useState } from 'react';
import { citasService } from '../../services/citasService';
import Swal from 'sweetalert2';
import { 
    FaCalendarCheck, FaCheckCircle, FaTimesCircle, FaClock, 
    FaFilter, FaSearch, FaBan, FaUserClock
} from 'react-icons/fa';

const AdminCitas = () => {
    const [activeTab, setActiveTab] = useState('PENDIENTE');
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroFecha, setFiltroFecha] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // Configuración de Pestañas
    const tabs = [
        { id: 'PENDIENTE', label: 'Por Revisar', icon: <FaClock/>, color: 'text-yellow-600 border-yellow-600' },
        { id: 'ACEPTADA', label: 'Aceptadas', icon: <FaCheckCircle/>, color: 'text-green-600 border-green-600' },
        { id: 'REALIZADA', label: 'Realizadas', icon: <FaCalendarCheck/>, color: 'text-blue-600 border-blue-600' },
        { id: 'CANCELADA', label: 'Canceladas', icon: <FaBan/>, color: 'text-red-600 border-red-600' },
        { id: 'INASISTENCIA', label: 'Inasistencias', icon: <FaUserClock/>, color: 'text-gray-600 border-gray-600' },
    ];

    useEffect(() => {
        cargarCitas();
    }, [activeTab, filtroFecha]);

    const cargarCitas = async () => {
        setLoading(true);
        try {
            const data = await citasService.getAll({ 
                estado: activeTab,
                fecha: filtroFecha 
            });
            setCitas(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const cambiarEstado = async (cita, nuevoEstado) => {
        const { isConfirmed } = await Swal.fire({
            title: `¿Cambiar a ${nuevoEstado}?`,
            text: `Paciente: ${cita.paciente_nombre}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar'
        });

        if (isConfirmed) {
            try {
                // LLAMADA AL NUEVO MÉTODO DEL SERVICIO (Punto 8)
                await citasService.updateEstado(cita.id, nuevoEstado);
                
                Swal.fire({
                    title: 'Actualizado',
                    text: 'Estado modificado correctamente.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                cargarCitas(); // Recargar para mover la cita de pestaña si aplica
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo actualizar. Intente nuevamente.', 'error');
            }
        }
    };

    // Filtro local por texto
    const citasFiltradas = citas.filter(c => 
        (c.paciente_nombre?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
        (c.profesional_nombre?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
        (c.paciente_doc?.includes(busqueda))
    );

    return (
        <div className="max-w-7xl mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Administración de Citas</h1>

            {/* BARRA DE HERRAMIENTAS */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between border border-gray-100">
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                        <FaFilter className="text-gray-400"/>
                        <span className="text-sm font-bold text-gray-600">Fecha:</span>
                        <input 
                            type="date" 
                            value={filtroFecha} 
                            onChange={(e) => setFiltroFecha(e.target.value)}
                            className="bg-transparent outline-none text-sm text-gray-700"
                        />
                        {filtroFecha && <button onClick={() => setFiltroFecha('')} className="text-xs text-red-500 font-bold ml-2 hover:text-red-700">Limpiar</button>}
                    </div>
                </div>

                <div className="relative">
                    <FaSearch className="absolute left-3 top-3 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="Buscar paciente, médico o documento..." 
                        className="pl-9 pr-4 py-2 border rounded-full text-sm w-72 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {/* TABS */}
            <div className="flex overflow-x-auto border-b border-gray-200 mb-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap transition-colors text-sm
                            ${activeTab === tab.id ? `border-b-2 ${tab.color} bg-white` : 'text-gray-500 hover:text-gray-700 bg-gray-50'}
                        `}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* TABLA DENSA */}
            <div className="bg-white shadow-lg overflow-hidden border-x border-b border-gray-200 min-h-[400px]">
                {loading ? (
                    <div className="p-20 text-center text-gray-500 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                        Cargando citas...
                    </div>
                ) : citasFiltradas.length === 0 ? (
                    <div className="p-20 text-center text-gray-400 italic">
                        No se encontraron citas para los filtros seleccionados.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm leading-normal">
                            <thead className="bg-gray-800 text-white uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">Paciente</th>
                                    <th className="px-4 py-3 text-left">Profesional</th>
                                    <th className="px-4 py-3 text-left">Servicio</th>
                                    <th className="px-4 py-3 text-left">Fecha / Hora</th>
                                    <th className="px-4 py-3 text-left">Sede</th>
                                    <th className="px-4 py-3 text-center w-32">Gestión</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {citasFiltradas.map(cita => (
                                    <tr key={cita.id} className="hover:bg-blue-50 transition duration-150 group">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900">{cita.paciente_nombre || 'Sin Nombre'}</div>
                                            <div className="text-xs text-gray-500 font-mono">{cita.paciente_doc}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 font-medium">{cita.profesional_nombre}</td>
                                        <td className="px-4 py-3">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold border border-blue-100 block w-fit">
                                                {cita.servicio_nombre}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-gray-800">{cita.fecha}</div>
                                            <div className="text-xs font-bold text-gray-500">{cita.hora_inicio?.slice(0,5)} - {cita.hora_fin?.slice(0,5)}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">{cita.lugar_nombre}</td>
                                        
                                        {/* ACCIONES EN LÍNEA */}
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                {activeTab === 'PENDIENTE' && (
                                                    <>
                                                        <button onClick={() => cambiarEstado(cita, 'ACEPTADA')} className="btn-icon bg-green-100 text-green-700 hover:bg-green-200 border border-green-200" title="Aceptar"><FaCheckCircle/></button>
                                                        <button onClick={() => cambiarEstado(cita, 'RECHAZADA')} className="btn-icon bg-red-100 text-red-700 hover:bg-red-200 border border-red-200" title="Rechazar"><FaTimesCircle/></button>
                                                    </>
                                                )}
                                                {activeTab === 'ACEPTADA' && (
                                                    <>
                                                        <button onClick={() => cambiarEstado(cita, 'REALIZADA')} className="btn-icon bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200" title="Realizada"><FaCalendarCheck/></button>
                                                        <button onClick={() => cambiarEstado(cita, 'INASISTENCIA')} className="btn-icon bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300" title="Inasistencia"><FaUserClock/></button>
                                                        <button onClick={() => cambiarEstado(cita, 'CANCELADA')} className="btn-icon bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200" title="Cancelar"><FaBan/></button>
                                                    </>
                                                )}
                                                {['REALIZADA', 'CANCELADA', 'RECHAZADA', 'INASISTENCIA'].includes(activeTab) && (
                                                    <span className="text-xs text-gray-400 italic">Sin acciones</span>
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
            
            <style>{`
                .btn-icon { padding: 6px; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
                .btn-icon:hover { transform: scale(1.1); }
            `}</style>
        </div>
    );
};

export default AdminCitas;