import React, { useEffect, useState } from 'react';
import { citasService } from '../../services/citasService';
import { FaCalendarPlus, FaNotesMedical, FaTimesCircle, FaCheckCircle, FaMapMarkerAlt } from 'react-icons/fa';
import Swal from 'sweetalert2'; // Usamos las alertas bonitas que instalamos
import { Link } from 'react-router-dom';

const MisCitas = () => {
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarCitas();
    }, []);

    const cargarCitas = async () => {
        try {
            const data = await citasService.getAll();
            setCitas(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Lógica de cancelación (Regla de negocio: > 24 horas)
    // Lógica de cancelación con manejo de errores inteligente
    const handleCancelar = async (id) => {
        const result = await Swal.fire({
            title: '¿Cancelar cita?',
            text: "Esta acción notificará al profesional.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cancelar'
        });

        if (result.isConfirmed) {
            try {
                await citasService.cancel(id);
                Swal.fire('Cancelada', 'La cita ha sido cancelada.', 'success');
                cargarCitas(); // Recargar tabla
            } catch (error) {
                // AQUÍ ESTÁ LA MAGIA: Leemos el mensaje que nos mandó el Backend
                const mensajeBackend = error.response?.data?.detalle;
                const mensajeError = mensajeBackend || 'No se pudo cancelar la cita. Intente más tarde.';
                
                Swal.fire({
                    icon: 'error',
                    title: 'No permitido',
                    text: mensajeError // Mostramos el texto parametrizado ("Faltan menos de 24 horas...")
                });
            }
        }
    };

    // Badge de Estados (Colores según tu documentación legado)
    const getStatusBadge = (estado) => {
        const config = {
            'PENDIENTE':  { color: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' },
            'ACEPTADA':   { color: 'bg-blue-100 text-blue-800', label: 'Aceptada' },
            'CONFIRMADA': { color: 'bg-green-100 text-green-800', label: 'Confirmada' }, // Alias de Aceptada
            'REALIZADA':  { color: 'bg-gray-100 text-gray-800', label: 'Realizada' },
            'CANCELADA':  { color: 'bg-red-100 text-red-800', label: 'Cancelada' }
        };
        
        const status = config[estado] || config['PENDIENTE'];

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                {status.label}
            </span>
        );
    };

    if (loading) return <div className="p-10 text-center text-blue-600 font-bold animate-pulse">Cargando historial...</div>;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-blue-900">Gestión de Citas</h1>
                    <p className="text-gray-500 text-sm">Consulta y administra tus agendamientos médicos.</p>
                </div>
                <Link to="/dashboard/citas/nueva" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg transition transform hover:scale-105">
                    <FaCalendarPlus />
                    <span>Agendar Nueva</span>
                </Link>
            </div>

            {/* Tabla */}
            {citas.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                    <FaNotesMedical className="text-6xl text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-700">Sin citas agendadas</h3>
                    <p className="text-gray-500">Aún no tienes historial en el sistema.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Detalles Médicos</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ubicación</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {citas.map((cita) => (
                                    <tr key={cita.id} className="hover:bg-blue-50 transition duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{cita.fecha}</div>
                                            <div className="text-sm text-blue-600">{cita.hora_inicio}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {/* IDs temporales hasta conectar microservicios */}
                                                Servicio ID: {cita.servicio_id || 'General'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Dr. ID: {cita.profesional_id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-600 gap-1">
                                                <FaMapMarkerAlt className="text-red-400"/>
                                                <span>Sede ID: {cita.lugar_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {getStatusBadge(cita.estado)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {cita.estado === 'PENDIENTE' || cita.estado === 'ACEPTADA' ? (
                                                <button 
                                                    onClick={() => handleCancelar(cita.id)}
                                                    className="text-red-500 hover:text-red-700 font-bold flex items-center justify-end gap-1 ml-auto"
                                                >
                                                    <FaTimesCircle /> Cancelar
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Sin acciones</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MisCitas;