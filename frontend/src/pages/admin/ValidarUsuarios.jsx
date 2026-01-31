import React, { useEffect, useState, useCallback } from 'react';
import { patientService } from '../../services/patientService';
import Swal from 'sweetalert2';
import { FaUserPlus, FaUsers, FaCheckCircle, FaClock, FaIdCard } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ValidarUsuarios = () => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [tiposPaciente, setTiposPaciente] = useState([]);
    const [loading, setLoading] = useState(true);

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const [dataSolicitudes, dataTipos] = await Promise.all([
                patientService.getSolicitudesPendientes(),
                patientService.getTiposPaciente()
            ]);
            setSolicitudes(dataSolicitudes);
            setTiposPaciente(dataTipos);
        } catch (error) {
            console.error("Error cargando datos admin:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            cargarDatos();
        }, 0);
        return () => clearTimeout(timer);
    }, [cargarDatos]);

    const handleValidar = async (solicitud) => {
        // Generamos opciones para el select
        const opcionesHtml = tiposPaciente
            .filter(t => t.activo)
            .map(t => `<option value="${t.id}">${t.nombre}</option>`)
            .join('');

        const { value: formValues } = await Swal.fire({
            title: `<h3 class="text-xl font-bold">Validar Registro</h3>`,
            html: `
                <div class="text-left bg-blue-50 p-4 rounded-lg mb-4 text-sm border border-blue-100">
                    <p><strong>Solicitante:</strong> ${solicitud.nombre}</p>
                    <p><strong>Email:</strong> ${solicitud.email}</p>
                    <p class="text-xs text-gray-500 mt-1">ID Auth: ${solicitud.user_id}</p>
                </div>
                
                <label class="block text-left text-xs font-bold text-gray-500 mb-1 ml-1">Documento de Identidad Real</label>
                <input id="val-doc" class="swal2-input m-0 w-full mb-4" placeholder="Ej: 10203040" value="${solicitud.user_doc || ''}">
                
                <label class="block text-left text-xs font-bold text-gray-500 mb-1 ml-1">Asignar Afiliación</label>
                <select id="val-tipo" class="swal2-select m-0 w-full">
                    <option value="" disabled selected>-- Seleccione Tipo --</option>
                    ${opcionesHtml}
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Confirmar Validación',
            confirmButtonColor: '#2563eb', // Blue-600
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            preConfirm: () => {
                const doc = document.getElementById('val-doc').value;
                const tipo = document.getElementById('val-tipo').value;
                if (!doc || !tipo) {
                    Swal.showValidationMessage('⚠️ Documento y Tipo son obligatorios');
                    return false;
                }
                return { doc, tipo };
            }
        });

        if (formValues) {
            Swal.fire({ title: 'Procesando...', didOpen: () => Swal.showLoading() });
            try {
                // 1. Crear el Paciente
                await patientService.create({
                    user_id: solicitud.user_id,
                    nombre: solicitud.nombre,
                    numero_documento: formValues.doc,
                    email_contacto: solicitud.email,
                    tipo_usuario: formValues.tipo,
                    tipo_documento: 'CC', // Default, podrías pedirlo en el modal también
                    fecha_nacimiento: '2000-01-01', // Default, el usuario lo actualiza luego
                    genero: 'O',
                    direccion: 'Validado por Admin',
                    activo: true
                });

                // 2. Marcar solicitud como procesada
                await patientService.updateSolicitud(solicitud.id, { ...solicitud, procesado: true });

                Swal.fire('¡Éxito!', 'Usuario validado y paciente creado.', 'success');
                cargarDatos(); 

            } catch (error) {
                // Si falla porque YA EXISTE (ej: particular que se registró solo), 
                // solo actualizamos la solicitud para sacarla de la lista
                if (error.response && error.response.status === 400) {
                     await patientService.updateSolicitud(solicitud.id, { ...solicitud, procesado: true });
                     Swal.fire('Actualizado', 'El paciente ya existía. Solicitud archivada.', 'info');
                     cargarDatos();
                } else {
                    console.error(error);
                    Swal.fire('Error', 'No se pudo completar la validación.', 'error');
                }
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            
            {/* Header Moderno */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                        <FaCheckCircle className="text-blue-600"/> Centro de Validación
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">
                        Gestiona las solicitudes de registro y nuevos ingresos.
                    </p>
                </div>
                <Link to="/dashboard/admin/pacientes" className="group relative inline-flex items-center justify-center px-6 py-3 font-bold text-blue-600 transition-all duration-200 bg-blue-50 rounded-xl hover:bg-blue-100 border border-blue-200">
                    <FaUsers className="mr-2"/> Ver Todos los Pacientes
                </Link>
            </div>
            
            {/* Tarjeta de Lista */}
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <FaClock className="text-orange-500"/> Pendientes de Revisión
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-black">
                            {solicitudes.length}
                        </span>
                    </h3>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        Cargando solicitudes...
                    </div>
                ) : solicitudes.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center">
                        <div className="bg-green-50 p-6 rounded-full mb-4">
                            <FaCheckCircle className="text-4xl text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">¡Todo al día!</h3>
                        <p className="text-gray-500">No hay solicitudes pendientes de validación.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full leading-normal text-left">
                            <thead className="bg-white text-gray-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Usuario Solicitante</th>
                                    <th className="px-6 py-4">Datos de Contacto</th>
                                    <th className="px-6 py-4">Fecha Solicitud</th>
                                    <th className="px-6 py-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {solicitudes.map(s => (
                                    <tr key={s.id} className="hover:bg-blue-50/30 transition duration-200 group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                                                    {s.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-base">{s.nombre}</div>
                                                    <div className="text-xs text-gray-400 font-mono">ID Auth: {s.user_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-gray-700 font-medium">{s.email}</div>
                                            {s.user_doc && <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><FaIdCard/> Doc: {s.user_doc}</div>}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold">
                                                {new Date(s.fecha_solicitud || s.fecha).toLocaleDateString()}
                                            </span>
                                            <div className="text-[10px] text-gray-400 mt-1 ml-1">
                                                {new Date(s.fecha_solicitud || s.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button 
                                                onClick={() => handleValidar(s)}
                                                className="group/btn relative inline-flex items-center justify-center px-5 py-2.5 font-bold text-white transition-all duration-200 bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-95 overflow-hidden"
                                            >
                                                <div className="absolute inset-0 w-full h-full transition-all duration-300 scale-0 group-hover/btn:scale-100 group-hover/btn:bg-white/10 rounded-xl"></div>
                                                <FaUserPlus className="mr-2 group-hover/btn:animate-bounce"/> Validar
                                            </button>
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

export default ValidarUsuarios;