import React, { useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import { authService } from '../../services/authService';

const PatientOnboarding = () => {
    const { user, setUser } = useContext(AuthContext); 
    const navigate = useNavigate();
    const hasChecked = useRef(false);
    
    useEffect(() => {
        if (!user || hasChecked.current) return;
        
        const verificarEstado = async () => {
            hasChecked.current = true;

            // 1. Ignorar Staff
            if (user.profesional_id || user.is_staff) return;

            // 2. Si ya es paciente, verificar redirección pendiente y salir
            if (user.paciente_id) {
                checkPendingRedirect();
                return;
            }

            // 3. Si NO es paciente, intentamos buscarlo por documento (Self-Healing)
            try {
                const syncResponse = await patientService.vincularExistente({
                    documento: user.documento,
                    user_id: user.user_id || user.id
                });

                // CASO A: El paciente EXISTÍA pero no estaba vinculado
                if (syncResponse.status === 'found') {
                    console.log("Perfil recuperado. Vinculando...");
                    
                    await authService.updateUser(user.user_id || user.id, { paciente_id: syncResponse.paciente_id });
                    
                    if (setUser) {
                        setUser({ ...user, paciente_id: syncResponse.paciente_id });
                    }
                    checkPendingRedirect();
                }

            } catch (error) {
                // CASO B: El paciente NO EXISTE (404) -> Es NUEVO -> Preguntar
                if (error.response && error.response.status === 404) {
                    showRegistrationModal();
                } else {
                    console.error("Error de verificación:", error);
                }
            }
        };

        verificarEstado();
        // eslint-disable-next-line
    }, [user]);

    const checkPendingRedirect = () => {
        const intencion = localStorage.getItem('intencionCita');
        if (intencion === 'PARTICULAR') {
            localStorage.removeItem('intencionCita');
            navigate('/dashboard/citas/nueva');
        }
    };

    const showRegistrationModal = async () => {
        // --- CORRECCIÓN 1: SIEMPRE PREGUNTAR ---
        // Eliminamos la validación de localStorage para forzar la pregunta siempre.

        const { isConfirmed, isDenied, isDismissed } = await Swal.fire({
            title: 'Bienvenido a TimeTrack',
            html: `
                <div class="text-left text-gray-600">
                    <p class="mb-3">Para agendar citas médicas, necesitamos configurar tu perfil clínico.</p>
                    <p class="text-sm font-bold text-blue-600">¿Cómo deseas registrarte?</p>
                </div>
            `,
            icon: 'info',
            
            // --- CORRECCIÓN 2: BOTÓN DE CERRAR (X) ---
            showCloseButton: true,  // Muestra la X en la esquina
            allowOutsideClick: true, // Permite cerrar clicando fuera
            allowEscapeKey: true,    // Permite cerrar con ESC
            
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Particular (Paga Cita)',
            confirmButtonColor: '#3b82f6', // Azul
            denyButtonText: 'Afiliado (EPS/Seguro)',
            denyButtonColor: '#10b981', // Verde
            cancelButtonText: 'Más tarde', // Botón gris para salir
        });

        if (isConfirmed) {
            await abrirFormularioParticular();
        } else if (isDenied) {
            await crearSolicitudValidacion();
        } else if (isDismissed) {
             // El usuario cerró el modal. No hacemos nada, se queda en la página actual.
             console.log("Registro pospuesto por el usuario.");
        }
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
            showCloseButton: true, // También agregamos X al formulario por si se arrepiente
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
                    tipo_usuario: 1, // Asegúrate que ID 1 sea Particular en tu BD
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

                // 3. LOGOUT FORZADO
                authService.logout();
                window.location.href = '/login';

            } catch (error) {
                console.error("Error creación:", error);
                Swal.fire('Error', 'No se pudo crear el perfil. Verifica los datos.', 'error');
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
            Swal.fire('Aviso', 'Ya tienes una solicitud en proceso de revisión.', 'info');
        }
    };

    return null; 
};

export default PatientOnboarding;