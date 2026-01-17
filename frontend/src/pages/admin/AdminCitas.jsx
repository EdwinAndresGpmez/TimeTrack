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
            // Pasamos filtros al servicio
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

    // Acciones de gestión
    const cambiarEstado = async (cita, nuevoEstado) => {
        const { isConfirmed } = await Swal.fire({
            title: `¿Cambiar a ${nuevoEstado}?`,
            text: `La cita de ${cita.paciente_nombre} pasará a estado ${nuevoEstado}.`,
            icon: 'question',
            showCancelButton: true
        });

        if (isConfirmed) {
            try {
                await citasService.updateEstado(cita.id, nuevoEstado);
                Swal.fire('Actualizado', `La cita ha sido marcada como ${nuevoEstado}.`, 'success');
                cargarCitas(); // Recargar lista
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Administración de Citas</h1>

            {/* FILTROS SUPERIORES */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <FaFilter className="text-gray-400"/>
                    <span className="font-bold text-gray-700">Filtrar por Fecha:</span>
                </div>
                <input 
                    type="date" 
                    value={filtroFecha} 
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="border rounded p-2 focus:ring-2 focus:ring-blue-500"
                />
                {filtroFecha && (
                    <button onClick={() => setFiltroFecha('')} className="text-sm text-red-500 hover:underline">
                        Limpiar filtro
                    </button>
                )}
            </div>

            {/* TABS DE ESTADOS */}
            <div className="flex overflow-x-auto border-b border-gray-200 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap transition-colors
                            ${activeTab === tab.id ? `border-b-2 ${tab.color} bg-gray-50` : 'text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Cargando citas...</div>
                ) : citas.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 italic">No hay citas en esta categoría.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full leading-normal">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                <tr>
                                    <th className="px-5 py-3 text-left">Paciente</th>
                                    <th className="px-5 py-3 text-left">Profesional / Servicio</th>
                                    <th className="px-5 py-3 text-left">Fecha y Hora</th>
                                    <th className="px-5 py-3 text-left">Ubicación</th>
                                    <th className="px-5 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {citas.map(cita => (
                                    <tr key={cita.id} className="hover:bg-blue-50 transition">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-gray-900">{cita.paciente_nombre || 'Sin Nombre'}</div>
                                            <div className="text-xs text-gray-500">ID: {cita.paciente_id}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-gray-900">{cita.profesional_nombre}</div>
                                            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded w-fit">
                                                {cita.servicio_nombre || 'Consulta General'}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-gray-800">{cita.fecha}</div>
                                            <div className="text-sm text-gray-600">{cita.hora_inicio} - {cita.hora_fin}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-600">
                                            {cita.lugar_nombre}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                {/* Botones contextuales según el estado */}
                                                
                                                {activeTab === 'PENDIENTE' && (
                                                    <>
                                                        <button onClick={() => cambiarEstado(cita, 'ACEPTADA')} className="bg-green-100 text-green-700 p-2 rounded hover:bg-green-200" title="Aceptar">
                                                            <FaCheckCircle/>
                                                        </button>
                                                        <button onClick={() => cambiarEstado(cita, 'RECHAZADA')} className="bg-red-100 text-red-700 p-2 rounded hover:bg-red-200" title="Rechazar">
                                                            <FaTimesCircle/>
                                                        </button>
                                                    </>
                                                )}

                                                {activeTab === 'ACEPTADA' && (
                                                    <>
                                                        <button onClick={() => cambiarEstado(cita, 'REALIZADA')} className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200" title="Marcar Realizada">
                                                            <FaCalendarCheck/>
                                                        </button>
                                                        <button onClick={() => cambiarEstado(cita, 'INASISTENCIA')} className="bg-gray-100 text-gray-700 p-2 rounded hover:bg-gray-200" title="Marcar Inasistencia">
                                                            <FaUserClock/>
                                                        </button>
                                                        <button onClick={() => cambiarEstado(cita, 'CANCELADA')} className="bg-yellow-100 text-yellow-700 p-2 rounded hover:bg-yellow-200" title="Cancelar">
                                                            <FaBan/>
                                                        </button>
                                                    </>
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
        </div>
    );
};

export default AdminCitas;