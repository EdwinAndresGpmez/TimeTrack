import React, { useEffect, useState, useCallback } from 'react';
import { patientService } from '../../services/patientService';
import Swal from 'sweetalert2';
import { FaUserPlus, FaUsers } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const ValidarUsuarios = () => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [tiposPaciente, setTiposPaciente] = useState([]);

    // 1. DEFINIR LA FUNCIÓN PRIMERO (Antes del useEffect)
    // Usamos useCallback para que la referencia de la función no cambie en cada render
    const cargarDatos = useCallback(async () => {
        try {
            // A. Cargas las solicitudes
            const dataSolicitudes = await patientService.getSolicitudesPendientes();
            setSolicitudes(dataSolicitudes);

            // B. Cargas los tipos de paciente dinámicamente
            const dataTipos = await patientService.getTiposPaciente();
            setTiposPaciente(dataTipos);
        } catch (error) {
            console.error("Error cargando datos admin:", error);
        }
    }, []); // No tiene dependencias externas que cambien

    // 2. EJECUTAR EL EFFECT DESPUÉS
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]); // ✅ Ahora es seguro añadirla como dependencia

    const handleCrearPaciente = async (solicitud) => {
        // Generamos las opciones del Select dinámicamente basado en la BD
        const opcionesHtml = tiposPaciente
            .filter(t => t.activo)
            .map(t => `<option value="${t.id}">${t.nombre}</option>`)
            .join('');

        const { value: formValues } = await Swal.fire({
            title: `Validar a ${solicitud.nombre}`,
            html: `
                <p class="text-sm text-gray-600 mb-4">Asigna la afiliación correcta para este usuario.</p>
                <input id="val-doc" class="swal2-input" placeholder="Número Documento Real" value="${solicitud.user_doc || ''}">
                <label class="block text-left text-xs font-bold text-gray-700 mt-4 ml-4">Tipo de Afiliación</label>
                <select id="val-tipo" class="swal2-select" style="display:flex; width: 88%; margin: 0 auto;">
                    <option value="" disabled selected>-- Seleccione --</option>
                    ${opcionesHtml}
                </select>
            `,
            focusConfirm: false,
            preConfirm: () => {
                const doc = document.getElementById('val-doc').value;
                const tipo = document.getElementById('val-tipo').value;
                
                if (!doc || !tipo) {
                    Swal.showValidationMessage('Documento y Tipo son obligatorios');
                    return false;
                }
                return { doc, tipo };
            }
        });

        if (formValues) {
            try {
                // 1. Crear el paciente
                await patientService.create({
                    user_id: solicitud.user_id,
                    nombre: solicitud.nombre,
                    numero_documento: formValues.doc,
                    email_contacto: solicitud.email,
                    tipo_usuario: formValues.tipo,
                    
                    // Defaults obligatorios
                    tipo_documento: 'CC', 
                    fecha_nacimiento: '2000-01-01',
                    genero: 'O',
                    direccion: 'Validado por Admin',
                    activo: true
                });

                // 2. Marcar solicitud como procesada
                 await patientService.updateSolicitud(solicitud.id, { ...solicitud, procesado: true });

                Swal.fire('Validado', 'El paciente ha sido creado y vinculado.', 'success');
                
                // Recargar tabla usando la función definida arriba
                cargarDatos(); 

            } catch (error) {
                console.error(error);
                if (error.response && error.response.status === 400) {
                     Swal.fire('Atención', 'El paciente ya existía. Se marcará la solicitud como procesada.', 'warning');
                     await patientService.updateSolicitud(solicitud.id, { ...solicitud, procesado: true });
                     cargarDatos();
                } else {
                    Swal.fire('Error', 'No se pudo validar el usuario.', 'error');
                }
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Centro de Validación</h1>
                <Link to="/dashboard/admin/pacientes" className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded">
                    <FaUsers/> Gestión de Pacientes
                </Link>
            </div>
            
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Solicitante</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Solicitud</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {solicitudes.length === 0 ? (
                            <tr><td colSpan="4" className="p-10 text-center text-gray-500 italic">No hay solicitudes pendientes.</td></tr>
                        ) : (
                            solicitudes.map(s => (
                                <tr key={s.id} className="hover:bg-blue-50 transition">
                                    <td className="px-6 py-4 border-b border-gray-200">
                                        <div className="text-sm font-bold text-gray-900">{s.nombre}</div>
                                        <div className="text-xs text-gray-400">User ID: {s.user_id}</div>
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-200 text-sm text-gray-600">{s.email}</td>
                                    <td className="px-6 py-4 border-b border-gray-200 text-sm text-gray-600">
                                        {new Date(s.fecha_solicitud || s.fecha).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-200 text-right">
                                        <button 
                                            onClick={() => handleCrearPaciente(s)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ml-auto shadow-sm transition transform hover:scale-105"
                                        >
                                            <FaUserPlus /> Validar & Crear
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ValidarUsuarios;