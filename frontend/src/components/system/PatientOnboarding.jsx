import React, { useEffect, useContext, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import { authService } from '../../services/authService';

const PatientOnboarding = () => {
    // Asumimos que AuthContext exporta 'setUser' para actualizar el estado local
    const { user, setUser } = useContext(AuthContext); 
    const navigate = useNavigate();
    const hasChecked = useRef(false);
    
    useEffect(() => {
        // Evitar ejecución si no hay usuario o ya se verificó en este montaje
        if (!user || hasChecked.current) return;
        
        const verificarEstadoUsuario = async () => {
            hasChecked.current = true;

            // 1. Si es Staff (Médico/Admin), ignorar flujo de paciente.
            if (user.profesional_id || user.is_staff) {
                return;
            }

            // 2. VERIFICACIÓN: ¿El token ya dice que es paciente?
            if (user.paciente_id) {
                verificarIntencionRedireccion();
                return;
            }

            // 3. AUTO-REPARACIÓN (Self-Healing):
            // Si el token dice "null" pero la BD dice "existe", corregimos aquí.
            try {
                const syncResponse = await patientService.vincularExistente({
                    documento: user.documento,
                    user_id: user.user_id || user.id
                });

                if (syncResponse.status === 'found') {
                    console.log("Paciente encontrado en BD. Sincronizando sesión...");

                    // A. Vinculamos en Backend (por seguridad)
                    await authService.updateUser(user.user_id || user.id, { 
                        paciente_id: syncResponse.paciente_id 
                    });

                    // B. CORRECCIÓN DEL BUCLE (Estado Local):
                    // Actualizamos el contexto de React manualmente para que la UI sepa 
                    // que ya es paciente sin necesidad de recargar o reloguear ahora mismo.
                    if (setUser) {
                        const updatedUser = { ...user, paciente_id: syncResponse.paciente_id };
                        setUser(updatedUser);
                        // Opcional: Actualizar localStorage si guardas el user ahí
                        // localStorage.setItem('user', JSON.stringify(updatedUser)); 
                    }

                    // C. Dejamos pasar
                    verificarIntencionRedireccion();
                    return;
                }

            } catch (error) {
                // SOLO SI REALMENTE NO EXISTE (404), MOSTRAMOS EL FORMULARIO
                if (error.response && error.response.status === 404) {
                    // Doble chequeo final
                    if (!user.paciente_id) {
                        iniciarFlujoDecision();
                    }
                } else {
                    console.error("Error verificando integridad:", error);
                }
            }
        };

        verificarEstadoUsuario();
        // eslint-disable-next-line
    }, [user]);

    const verificarIntencionRedireccion = () => {
        const intencion = localStorage.getItem('intencionCita');
        if (intencion === 'PARTICULAR') {
            localStorage.removeItem('intencionCita');
            navigate('/dashboard/citas/nueva');
        }
    };

    const iniciarFlujoDecision = async () => {
        const intencion = localStorage.getItem('intencionCita');
        if (intencion === 'PARTICULAR') {
            await abrirFormularioParticular();
            return;
        }

        const { isConfirmed, isDenied } = await Swal.fire({
            title: 'Configuración de Acceso',
            html: `<p class="mb-4 text-gray-600">No tienes un perfil clínico activo.</p>
                   <div class="text-sm bg-yellow-50 p-4 rounded text-left border border-yellow-200">
                       <p class="font-bold text-yellow-800 mb-2">⚠ Requerido:</p>
                       <p>Para gestionar citas, debes activar tu perfil de paciente.</p>
                   </div>`,
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Quiero Cita Particular',
            denyButtonText: 'Soy Afiliado EPS/Seguro',
            cancelButtonText: 'Salir',
            allowOutsideClick: false,
            allowEscapeKey: false
        });

        if (isConfirmed) await abrirFormularioParticular();
        else if (isDenied) await crearSolicitudValidacion();
        else navigate('/'); // O logout si prefieres
    };

    const abrirFormularioParticular = async () => {
        const { value: formValues } = await Swal.fire({
             title: 'Registro Paciente Particular',
             html: `
                <p class="text-sm text-gray-500 mb-4">Completa tus datos para activar la cuenta.</p>
                <input class="swal2-input m-0 mb-3 w-full bg-gray-100" value="${user.nombre}" readonly>
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <input class="swal2-input m-0 w-full bg-gray-100" value="${user.documento}" readonly>
                    <input id="sw-tel" class="swal2-input m-0 w-full" value="${user.numero || user.telefono || ''}" placeholder="Celular *">
                </div>
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <input type="date" id="sw-fecha" class="swal2-input m-0 w-full" max="${new Date().toISOString().split('T')[0]}">
                    <select id="sw-genero" class="swal2-select m-0 w-full h-12">
                        <option value="" disabled selected>Género *</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="O">Otro</option>
                    </select>
                </div>
                <input id="sw-dir" class="swal2-input m-0 w-full" placeholder="Dirección *">
            `,
            focusConfirm: false,
            allowOutsideClick: false,
            preConfirm: () => {
                const tel = document.getElementById('sw-tel').value;
                const fecha = document.getElementById('sw-fecha').value;
                const genero = document.getElementById('sw-genero').value;
                const dir = document.getElementById('sw-dir').value;

                if (!fecha || !genero || !dir || !tel) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                    return false;
                }
                return { tel, fecha, genero, dir };
            }
        });

        if (formValues) {
            Swal.fire({ title: 'Creando perfil...', didOpen: () => Swal.showLoading() });

            try {
                // 1. Crear Paciente
                const nuevoPaciente = await patientService.create({
                    user_id: user.user_id || user.id,
                    nombre: user.nombre,
                    numero_documento: user.documento,
                    tipo_documento: user.tipo_documento || 'CC',
                    email_contacto: user.email || user.correo,
                    telefono: formValues.tel,
                    fecha_nacimiento: formValues.fecha,
                    genero: formValues.genero,
                    direccion: formValues.dir,
                    tipo_usuario: 1, // Particular
                    activo: true
                });

                // 2. Vincular usuario
                await authService.updateUser(user.user_id || user.id, { 
                    paciente_id: nuevoPaciente.id 
                });

                await Swal.fire({
                    icon: 'success',
                    title: 'Perfil Activado',
                    text: 'Bienvenido. Por seguridad, debes iniciar sesión nuevamente.',
                    confirmButtonText: 'Reiniciar Sesión',
                    allowOutsideClick: false
                });

                // 3. LOGOUT FORZADO (Crítico para actualizar el Token JWT)
                authService.logout();
                window.location.href = '/login';

            } catch (error) {
                console.error("Error creación:", error);
                
                // Si el error dice que ya existe, recargamos para que el useEffect lo arregle
                if (error.response?.data?.numero_documento) {
                     window.location.reload();
                } else {
                     Swal.fire('Error', 'No se pudo crear el perfil. Verifica los datos.', 'error');
                }
            }
        }
    };

    const crearSolicitudValidacion = async () => {
        try {
            await patientService.crearSolicitudValidacion({
                user_id: user.user_id || user.id,
                nombre: user.nombre,
                email: user.email || user.correo,
                fecha: new Date().toISOString()
            });
            await Swal.fire('Solicitud Enviada', 'Te notificaremos vía email cuando validemos tu EPS.', 'success');
        } catch (error) {
            Swal.fire('Aviso', 'Ya tienes una solicitud en proceso.', 'info');
        }
    };

    return null; 
};

export default PatientOnboarding;