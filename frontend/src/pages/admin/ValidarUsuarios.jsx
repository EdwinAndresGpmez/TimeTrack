import React, { useEffect, useState, useCallback } from 'react';
import { patientService } from '../../services/patientService';
import { authService } from '../../services/authService'; // Necesario para bloquear/corregir usuario
import Swal from 'sweetalert2';
import { 
    FaUserPlus, 
    FaUserTimes, 
    FaClock, 
    FaIdCard, 
    FaExclamationTriangle, 
    FaCheckCircle, 
    FaUsers 
} from 'react-icons/fa';
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
        const timer = setTimeout(() => { cargarDatos(); }, 0);
        return () => clearTimeout(timer);
    }, [cargarDatos]);

    // --- ACCIÓN 1: VALIDAR Y CORREGIR ---
    const handleValidar = async (solicitud) => {
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
                
                <div class="text-left mb-1 ml-1">
                    <label class="text-xs font-bold text-gray-500">Documento Real (Corregir si es necesario)</label>
                    <p class="text-[10px] text-orange-500 italic mb-1">
                        * Si cambias este número, se actualizará también en la cuenta de usuario.
                    </p>
                </div>
                <input id="val-doc" class="swal2-input m-0 w-full mb-4" placeholder="Ej: 10203040" value="${solicitud.user_doc || ''}">
                
                <label class="block text-left text-xs font-bold text-gray-500 mb-1 ml-1">Asignar Afiliación</label>
                <select id="val-tipo" class="swal2-select m-0 w-full">
                    <option value="" disabled selected>-- Seleccione Tipo --</option>
                    ${opcionesHtml}
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Confirmar y Crear',
            confirmButtonColor: '#2563eb',
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
                // 1. (CRÍTICO) Si el admin corrigió el documento, actualizamos el Usuario Auth primero
                if (formValues.doc !== solicitud.user_doc) {
                    await authService.updateUserAdmin(solicitud.user_id, { documento: formValues.doc });
                }

                // 2. Crear el Paciente
                await patientService.create({
                    user_id: solicitud.user_id,
                    nombre: solicitud.nombre,
                    numero_documento: formValues.doc, // Usamos el corregido
                    email_contacto: solicitud.email,
                    tipo_usuario: formValues.tipo,
                    tipo_documento: 'CC',
                    fecha_nacimiento: '2000-01-01',
                    genero: 'O',
                    direccion: 'Validado por Admin',
                    activo: true
                });

                // 3. Cerrar solicitud
                await patientService.updateSolicitud(solicitud.id, { ...solicitud, procesado: true });

                Swal.fire('¡Éxito!', 'Datos sincronizados y paciente creado.', 'success');
                cargarDatos(); 

            } catch (error) {
                // Manejo de duplicados (Paciente ya existe)
                if (error.response && error.response.status === 400) {
                     // Si el paciente ya existe, intentamos VINCULARLO en vez de fallar
                     try {
                        const sync = await patientService.vincularExistente({
                            documento: formValues.doc,
                            user_id: solicitud.user_id
                        });
                        if (sync.status === 'found') {
                            await authService.updateUserAdmin(solicitud.user_id, { paciente_id: sync.paciente_id });
                            await patientService.updateSolicitud(solicitud.id, { ...solicitud, procesado: true });
                            Swal.fire('Vinculado', 'El paciente ya existía. Se vinculó la cuenta exitosamente.', 'success');
                            cargarDatos();
                            return;
                        }
                     } catch (e) { console.log(e); }
                     
                     Swal.fire('Error', 'El documento ya pertenece a otro paciente y no se pudo vincular autom.', 'error');
                } else {
                    console.error(error);
                    Swal.fire('Error', 'No se pudo completar la operación.', 'error');
                }
            }
        }
    };

    // --- ACCIÓN 2: RECHAZAR / INACTIVAR ---
    const handleRechazar = async (solicitud) => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Rechazar y Eliminar?',
            html: `
                <p class="text-sm text-gray-600 mb-2">
                    Esto marcará la solicitud como procesada y <b>ELIMINARÁ</b> la cuenta de usuario creada.
                </p>
                <p class="text-xs text-blue-500 italic">
                    * Esto liberará el documento y correo para que pueda registrarse nuevamente.
                </p>
                <div class="bg-red-50 p-3 rounded text-xs text-red-800 font-bold border border-red-100 mt-2">
                    <FaExclamationTriangle className="inline mr-1"/> Acción Destructiva.
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Rechazar y Eliminar',
            confirmButtonColor: '#dc2626',
            cancelButtonText: 'Cancelar'
        });

        if (isConfirmed) {
            try {
                await authService.deleteUser(solicitud.user_id); 
            
                await patientService.updateSolicitud(solicitud.id, { ...solicitud, procesado: true });

                Swal.fire('Rechazado', 'El usuario ha sido eliminado y la solicitud cerrada.', 'success');
                cargarDatos();
            } catch (error) {
                console.error(error);

                if (error.response && error.response.status === 404) {
                     await patientService.updateSolicitud(solicitud.id, { ...solicitud, procesado: true });
                     Swal.fire('Listo', 'El usuario ya no existía, solicitud cerrada.', 'success');
                     cargarDatos();
                } else {
                    Swal.fire('Error', 'No se pudo rechazar la solicitud.', 'error');
                }
            }
        }
    };
    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                        <FaCheckCircle className="text-blue-600"/> Centro de Validación
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">Gestiona ingresos y correcciones de identidad.</p>
                </div>
                <Link to="/dashboard/admin/pacientes" className="px-6 py-3 font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 border border-blue-200">
                    <FaUsers className="mr-2 inline"/> Ver Todos
                </Link>
            </div>
            
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <FaClock className="text-orange-500"/> Pendientes
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-black">{solicitudes.length}</span>
                    </h3>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400">Cargando...</div>
                ) : solicitudes.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center">
                        <div className="bg-green-50 p-6 rounded-full mb-4"><FaCheckCircle className="text-4xl text-green-500" /></div>
                        <h3 className="text-lg font-bold text-gray-800">¡Todo al día!</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full leading-normal text-left">
                            <thead className="bg-white text-gray-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Usuario</th>
                                    <th className="px-6 py-4">Documento (Reportado)</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {solicitudes.map(s => (
                                    <tr key={s.id} className="hover:bg-blue-50/30 transition duration-200">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-gray-900">{s.nombre}</div>
                                            <div className="text-xs text-gray-400">{s.email}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded w-max">
                                                <FaIdCard/> {s.user_doc || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex justify-center gap-3">
                                                <button onClick={() => handleValidar(s)} className="text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-transform active:scale-95 flex items-center gap-2">
                                                    <FaUserPlus/> Validar / Corregir
                                                </button>
                                                <button onClick={() => handleRechazar(s)} className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1">
                                                    <FaUserTimes/> Rechazar
                                                </button>
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

export default ValidarUsuarios;