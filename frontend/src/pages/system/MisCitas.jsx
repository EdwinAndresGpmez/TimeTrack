import React, { useEffect, useState, useContext } from 'react';
import { citasService } from '../../services/citasService';
import { staffService } from '../../services/staffService'; 
import { patientService } from '../../services/patientService'; 
import { AuthContext } from '../../context/AuthContext'; 
import { FaCalendarPlus, FaNotesMedical, FaTimesCircle, FaCheckCircle, FaMapMarkerAlt, FaUserMd, FaStethoscope } from 'react-icons/fa';
import Swal from 'sweetalert2'; 
import { Link } from 'react-router-dom';
import DataUpdateEnforcer from '../../components/system/DataUpdateEnforcer'; 

const MisCitas = () => {
    const { user } = useContext(AuthContext); 

    const [citas, setCitas] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [pacienteId, setPacienteId] = useState(null); 

    // CORRECCIÓN: Validar user.user_id (Formato JWT de Django) o user.id
    useEffect(() => {
        if (user && (user.user_id || user.id)) {
            cargarDatosCompletos();
        }
    }, [user]);

    const cargarDatosCompletos = async () => {
        setLoading(true);
        try {
            let currentPacienteId = null;
            try {
                const idParaBuscar = user.user_id || user.id; 
                const perfil = await patientService.getProfileByUserId(idParaBuscar);
                currentPacienteId = perfil.id;
                setPacienteId(perfil.id);
            } catch (e) {
                console.warn("El usuario aún no tiene ficha de paciente creada.");
            }

            const promesas = [
                staffService.getServicios(),
                staffService.getProfesionales(),
                staffService.getLugares()
            ];

            if (currentPacienteId) {
                promesas.unshift(citasService.getAll({ paciente_id: currentPacienteId }));
            } else {
                promesas.unshift(Promise.resolve([])); 
            }

            const [dataCitas, dataServicios, dataProfesionales, dataSedes] = await Promise.all(promesas);

            const citasList = Array.isArray(dataCitas) ? dataCitas : (dataCitas.results || []);

            setCitas(citasList);
            setServicios(dataServicios);
            setProfesionales(dataProfesionales);
            setSedes(dataSedes);

        } catch (err) {
            console.error("Error cargando datos", err);
            if (!err.response || err.response.status !== 404) {
                Swal.fire('Error', 'No se pudo cargar el historial completo. Por favor, recarga la página.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const getNombreServicio = (id) => {
        const item = servicios.find(s => s.id === id);
        return item ? item.nombre : 'Servicio General';
    };

    const getNombreProfesional = (id) => {
        const item = profesionales.find(p => p.id === id);
        return item ? item.nombre : 'Profesional Asignado';
    };

    const getNombreSede = (id) => {
        const item = sedes.find(s => s.id === id);
        return item ? item.nombre : 'Sede Principal';
    };

    const getDireccionSede = (id) => {
        const item = sedes.find(s => s.id === id);
        return item ? item.direccion : '';
    };

    const handleCancelar = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Al cancelar liberarás este espacio para otro paciente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cancelar cita',
            cancelButtonText: 'No, mantenerla'
        });

        if (result.isConfirmed) {
            try {
                await citasService.cancel(id);
                
                await Swal.fire('¡Cancelada!', 'Tu cita ha sido cancelada exitosamente.', 'success');
                
                if (pacienteId) {
                    const nuevasCitas = await citasService.getAll({ paciente_id: pacienteId });
                    setCitas(Array.isArray(nuevasCitas) ? nuevasCitas : (nuevasCitas.results || []));
                }

            } catch (error) {
                console.error("Error al cancelar:", error);
                let mensajeUsuario = 'Ocurrió un error inesperado al cancelar. Intenta nuevamente.';
                if (error.response && error.response.data) {
                    const data = error.response.data;
                    if (data.detalle) mensajeUsuario = data.detalle;
                    else if (data.detail) mensajeUsuario = data.detail;
                    else if (data.non_field_errors && Array.isArray(data.non_field_errors)) mensajeUsuario = data.non_field_errors[0];
                    else if (typeof data === 'object') {
                        const mensajes = Object.values(data).flat();
                        if (mensajes.length > 0) mensajeUsuario = mensajes.join('. ');
                    }
                }
                Swal.fire({ icon: 'error', title: 'No se pudo cancelar', text: mensajeUsuario });
            }
        }
    };

    const getStatusBadge = (estado) => {
        const config = {
            'PENDIENTE':  { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pendiente' },
            'ACEPTADA':   { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Aceptada' },
            'CONFIRMADA': { color: 'bg-green-100 text-green-800 border-green-200', label: 'Confirmada' },
            'EN_SALA':    { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'En Sala' },
            'REALIZADA':  { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Realizada' },
            'CANCELADA':  { color: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelada' },
            'NO_ASISTIO': { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'No Asistió' },
            'INASISTENCIA': { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'No Asistió' }
        };
        const status = config[estado] || config['PENDIENTE'];
        return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>{status.label}</span>;
    };

    // Spinner de carga
    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-blue-600">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <span className="font-bold">Cargando tu historial médico...</span>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-4">
            <DataUpdateEnforcer />

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800">Mis Citas</h1>
                    <p className="text-gray-500 mt-1">Consulta y administra tus próximos agendamientos.</p>
                </div>
                <Link to="/dashboard/citas/nueva" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-200 transition transform hover:-translate-y-1">
                    <FaCalendarPlus />
                    <span className="font-bold">Agendar Nueva Cita</span>
                </Link>
            </div>

            {citas.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaNotesMedical className="text-4xl text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700">Aún no tienes citas</h3>
                    <p className="text-gray-500 mt-2 mb-6">Cuando agendes una cita, aparecerá aquí.</p>
                    <Link to="/dashboard/citas/nueva" className="text-blue-600 font-bold hover:underline">¡Agenda tu primera cita ahora!</Link>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Profesional / Servicio</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ubicación</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {citas.map((cita) => (
                                    <tr key={cita.id} className="hover:bg-blue-50/50 transition duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-800">{cita.fecha}</div>
                                            <div className="text-xs text-blue-600 font-bold bg-blue-50 inline-block px-2 py-0.5 rounded mt-1">
                                                {cita.hora_inicio?.slice(0, 5)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FaStethoscope className="text-gray-400 text-xs"/>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {getNombreServicio(cita.servicio_id)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaUserMd className="text-gray-400 text-xs"/>
                                                <span className="text-xs text-gray-500">
                                                    Dr. {getNombreProfesional(cita.profesional_id)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="flex items-center text-sm font-medium text-gray-700 gap-2">
                                                    <FaMapMarkerAlt className="text-red-500"/>
                                                    <span>{getNombreSede(cita.lugar_id)}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 pl-6 mt-0.5">
                                                    {getDireccionSede(cita.lugar_id)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {getStatusBadge(cita.estado)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {(cita.estado === 'PENDIENTE' || cita.estado === 'ACEPTADA') ? (
                                                <button 
                                                    onClick={() => handleCancelar(cita.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1 ml-auto text-xs font-bold border border-transparent hover:border-red-100"
                                                >
                                                    <FaTimesCircle /> Cancelar
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 italic text-xs">--</span>
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