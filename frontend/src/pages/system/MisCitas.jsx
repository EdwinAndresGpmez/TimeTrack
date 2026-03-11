import React, { useEffect, useState, useContext } from 'react';
import { citasService } from '../../services/citasService';
import { staffService } from '../../services/staffService';
import { patientService } from '../../services/patientService';
import { AuthContext } from '../../context/AuthContext';
import { FaCalendarPlus, FaNotesMedical, FaTimesCircle, FaMapMarkerAlt, FaUserMd, FaStethoscope } from 'react-icons/fa';
import AnimatedActionButton from '../../components/system/AnimatedActionButton';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import DataUpdateEnforcer from '../../components/system/DataUpdateEnforcer';
import { useUI } from '../../context/UIContext';

const MisCitas = () => {
    const { user } = useContext(AuthContext);
    const { td } = useUI();

    const [citas, setCitas] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pacienteId, setPacienteId] = useState(null);

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
            } catch (_e) {
            }

            const promesas = [
                staffService.getServicios(),
                staffService.getProfesionales(),
                staffService.getLugares()
            ];

            if (currentPacienteId) promesas.unshift(citasService.getAll({ paciente_id: currentPacienteId }));
            else promesas.unshift(Promise.resolve([]));

            const [dataCitas, dataServicios, dataProfesionales, dataSedes] = await Promise.all(promesas);
            const citasList = Array.isArray(dataCitas) ? dataCitas : (dataCitas.results || []);
            setCitas(citasList);
            setServicios(dataServicios || []);
            setProfesionales(dataProfesionales || []);
            setSedes(dataSedes || []);

        } catch (err) {
            if (!err.response || err.response.status !== 404) {
                Swal.fire(td('Error', 'Error'), td('No se pudo cargar el historial completo. Por favor, recarga la pagina.', 'Could not load complete history. Please reload the page.'), 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const getNombreServicio = (id) => (servicios.find(s => s.id === id)?.nombre || td('Servicio General', 'General service'));
    const getNombreProfesional = (id) => (profesionales.find(p => p.id === id)?.nombre || td('Profesional Asignado', 'Assigned professional'));
    const getNombreSede = (id) => (sedes.find(s => s.id === id)?.nombre || td('Sede Principal', 'Main location'));
    const getDireccionSede = (id) => (sedes.find(s => s.id === id)?.direccion || '');

    const handleCancelar = async (id) => {
        const result = await Swal.fire({
            title: td('Estas seguro?', 'Are you sure?'),
            text: td('Al cancelar liberaras este espacio para otro paciente.', 'By cancelling, this slot will be released for another patient.'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: td('Si, cancelar cita', 'Yes, cancel appointment'),
            cancelButtonText: td('No, mantenerla', 'No, keep it')
        });

        if (result.isConfirmed) {
            try {
                await citasService.cancel(id);
                await Swal.fire(td('Cancelada', 'Cancelled'), td('Tu cita ha sido cancelada exitosamente.', 'Your appointment was cancelled successfully.'), 'success');
                if (pacienteId) {
                    const nuevasCitas = await citasService.getAll({ paciente_id: pacienteId });
                    setCitas(Array.isArray(nuevasCitas) ? nuevasCitas : (nuevasCitas.results || []));
                }
            } catch (error) {
                let mensajeUsuario = td('Ocurrio un error inesperado al cancelar. Intenta nuevamente.', 'Unexpected error while cancelling. Try again.');
                const data = error?.response?.data;
                if (data?.detalle) mensajeUsuario = data.detalle;
                else if (data?.detail) mensajeUsuario = data.detail;
                else if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length) mensajeUsuario = data.non_field_errors[0];
                Swal.fire({ icon: 'error', title: td('No se pudo cancelar', 'Could not cancel'), text: mensajeUsuario });
            }
        }
    };

    const getStatusBadge = (estado) => {
        const config = {
            PENDIENTE: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: td('Pendiente', 'Pending') },
            ACEPTADA: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: td('Aceptada', 'Accepted') },
            CONFIRMADA: { color: 'bg-green-100 text-green-800 border-green-200', label: td('Confirmada', 'Confirmed') },
            EN_SALA: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: td('En Sala', 'In room') },
            REALIZADA: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: td('Realizada', 'Completed') },
            CANCELADA: { color: 'bg-red-100 text-red-800 border-red-200', label: td('Cancelada', 'Cancelled') },
            NO_ASISTIO: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: td('No Asistio', 'No-show') },
            INASISTENCIA: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: td('No Asistio', 'No-show') },
        };
        const status = config[estado] || config.PENDIENTE;
        return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>{status.label}</span>;
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-blue-600">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <span className="font-bold">{td('Cargando tu historial medico...')}</span>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-4">
            <DataUpdateEnforcer />

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800">{td('Mis Citas')}</h1>
                    <p className="text-gray-500 mt-1">{td('Consulta y administra tus proximos agendamientos.')}</p>
                </div>
                <AnimatedActionButton
                    as={Link}
                    to="/dashboard/citas/nueva"
                    label={td('Agendar Nueva Cita')}
                    icon={<FaCalendarPlus />}
                    color="blue"
                    className="px-6 py-3"
                />
            </div>

            {citas.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaNotesMedical className="text-4xl text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700">{td('Aun no tienes citas')}</h3>
                    <p className="text-gray-500 mt-2 mb-6">{td('Cuando agendes una cita, aparecera aqui.')}</p>
                    <AnimatedActionButton as={Link} to="/dashboard/citas/nueva" label={td('Agenda tu primera cita ahora')} color="blue" size="sm" className="mt-4" />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{td('Fecha / Hora')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{td('Profesional / Servicio')}</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{td('Ubicacion')}</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{td('Estado')}</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">{td('Acciones')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {citas.map((cita) => (
                                    <tr key={cita.id} className="hover:bg-blue-50/50 transition duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-800">{cita.fecha}</div>
                                            <div className="text-xs text-blue-600 font-bold bg-blue-50 inline-block px-2 py-0.5 rounded mt-1">{cita.hora_inicio?.slice(0, 5)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FaStethoscope className="text-gray-400 text-xs" />
                                                <span className="text-sm font-bold text-gray-900">{getNombreServicio(cita.servicio_id)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaUserMd className="text-gray-400 text-xs" />
                                                <span className="text-xs text-gray-500">{td('Dr.', 'Dr.')} {getNombreProfesional(cita.profesional_id)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="flex items-center text-sm font-medium text-gray-700 gap-2">
                                                    <FaMapMarkerAlt className="text-red-500" />
                                                    <span>{getNombreSede(cita.lugar_id)}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 pl-6 mt-0.5">{getDireccionSede(cita.lugar_id)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusBadge(cita.estado)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {(cita.estado === 'PENDIENTE' || cita.estado === 'ACEPTADA') ? (
                                                <AnimatedActionButton onClick={() => handleCancelar(cita.id)} label={td('Cancelar')} color="red" size="sm" icon={<FaTimesCircle />} className="ml-auto" />
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
