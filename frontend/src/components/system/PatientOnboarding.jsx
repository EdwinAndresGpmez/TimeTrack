import React, { useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import { authService } from '../../services/authService';
import { getClinicOnboardingKeys } from '../../utils/clinicOnboarding';
import { GUIDE_OPEN_EVENT } from './ClinicGuideAssistant';

const PatientOnboarding = () => {
    const { user, setUser } = useContext(AuthContext); 
    const navigate = useNavigate();
    const hasChecked = useRef(false);
    const hasAdminRole = Boolean(
        user?.is_staff ||
        user?.is_superuser ||
        (Array.isArray(user?.roles) && user.roles.includes('Administrador'))
    );

    const checkPendingRedirect = useCallback(() => {
        const intencion = localStorage.getItem('intencionCita');
        if (intencion === 'PARTICULAR') {
            localStorage.removeItem('intencionCita');
            navigate('/dashboard/citas/nueva');
        }
    }, [navigate]);

    const getNombreCompletoUsuario = useCallback(() => {
        if (user?.nombre_completo) return user.nombre_completo;
        return `${user?.nombre || ''} ${user?.apellidos || ''}`.trim();
    }, [user]);

    const crearSolicitudValidacion = useCallback(async () => {
        try {
            await patientService.crearSolicitudValidacion({
                user_id: user.user_id || user.id,
                nombre: getNombreCompletoUsuario(),
                email: user.email || user.correo,
                user_doc: user.documento, 
                fecha: new Date().toISOString(),
                tipo_solicitud: 'REGISTRO_EPS', // Opcional: para diferenciar
                procesado: false
            });
            await Swal.fire('Solicitud Enviada', 'Te notificaremos vía email cuando validemos tu EPS.', 'success');
        } catch {
            Swal.fire('Aviso', 'Ya tienes una solicitud en proceso de revisión.', 'info');
        }
    }, [getNombreCompletoUsuario, user]);

    const resolverTipoParticularId = useCallback(async () => {
        const tipos = await patientService.getTiposPaciente();
        const lista = Array.isArray(tipos) ? tipos : (tipos?.results || []);
        const normalizar = (v) =>
            String(v || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();

        const exacto = lista.find((t) => normalizar(t.nombre) === 'particular');
        if (exacto?.id) return exacto.id;

        const aproximado = lista.find((t) => normalizar(t.nombre).includes('particular'));
        if (aproximado?.id) return aproximado.id;

        return null;
    }, []);

    const abrirFormularioParticular = useCallback(async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Registro Paciente Particular',
            html: `
                <p class="text-sm text-gray-500 mb-4">Completa tus datos para activar la cuenta.</p>
                <input class="swal2-input m-0 mb-3 w-full bg-gray-100" value="${getNombreCompletoUsuario()}" readonly>
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
            showCloseButton: true,
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
                const tipoParticularId = await resolverTipoParticularId();
                if (!tipoParticularId) {
                    throw new Error('No existe un tipo de paciente "Particular" en el catálogo.');
                }

                const nuevoPaciente = await patientService.create({
                    user_id: user.user_id || user.id,
                    nombre: user.nombre,
                    apellido: user.apellidos || '',
                    numero_documento: user.documento,
                    tipo_documento: user.tipo_documento || 'CC',
                    email_contacto: user.email || user.correo,
                    telefono: formValues.tel,
                    fecha_nacimiento: formValues.fecha,
                    genero: formValues.genero,
                    direccion: formValues.dir,
                    tipo_usuario: tipoParticularId,
                    activo: true
                });

                await authService.updateUser(user.user_id || user.id, { 
                    paciente_id: nuevoPaciente.id 
                });

                try {
                    await patientService.crearSolicitudValidacion({
                        user_id: user.user_id || user.id,
                        nombre: getNombreCompletoUsuario(),
                        email: user.email || user.correo,
                        fecha: new Date().toISOString(),
                        user_doc: user.documento, // Este ya estaba bien
                        tipo_solicitud: 'REGISTRO_PARTICULAR',
                        procesado: false 
                    });
                } catch (e) {
                    console.log("Nota: Notificación admin omitida (ya existe solicitud).", e);
                }

                await Swal.fire({
                    icon: 'success',
                    title: 'Perfil Activado',
                    text: 'Bienvenido. Por seguridad, debes iniciar sesión nuevamente.',
                    confirmButtonText: 'Reiniciar Sesión',
                    allowOutsideClick: false
                });

                authService.logout();
                window.location.href = '/login';

            } catch (error) {
                console.error("Error creación:", error);
                Swal.fire('Error', 'No se pudo crear el perfil. Verifica los datos.', 'error');
            }
        }
    }, [getNombreCompletoUsuario, resolverTipoParticularId, user]);

    const showRegistrationModal = useCallback(async () => {
        const { isConfirmed, isDenied, isDismissed } = await Swal.fire({
            title: 'Bienvenido a Idefnova',
            html: `
                <div class="text-left text-gray-600">
                    <p class="mb-3">Para agendar citas médicas, necesitamos configurar tu perfil clínico.</p>
                    <p class="text-sm font-bold text-blue-600">¿Cómo deseas registrarte?</p>
                </div>
            `,
            icon: 'info',
            showCloseButton: true,
            allowOutsideClick: true,
            allowEscapeKey: true,
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Particular (Paga Cita)',
            confirmButtonColor: '#3b82f6',
            denyButtonText: 'Afiliado (EPS/Seguro)',
            denyButtonColor: '#10b981',
            cancelButtonText: 'Más tarde',
        });

        if (isConfirmed) {
            await abrirFormularioParticular();
        } else if (isDenied) {
            await crearSolicitudValidacion();
        } else if (isDismissed) {
             console.log("Registro pospuesto por el usuario.");
        }
    }, [abrirFormularioParticular, crearSolicitudValidacion]);

    const showClinicOnboarding = useCallback(async () => {
        const keys = getClinicOnboardingKeys(user);
        if (localStorage.getItem(keys.done) === '1') return;
        if (sessionStorage.getItem(keys.seenSession) === '1') return;

        const snoozeUntil = Number(localStorage.getItem(keys.snoozeUntil) || 0);
        if (snoozeUntil && Date.now() < snoozeUntil) return;

        sessionStorage.setItem(keys.seenSession, '1');
        localStorage.setItem(keys.assistantOpen, '1');
        window.dispatchEvent(new CustomEvent(GUIDE_OPEN_EVENT));
    }, [user]);

    useEffect(() => {
        if (!user || hasChecked.current) return;
        
        const verificarEstado = async () => {
            hasChecked.current = true;

            if (hasAdminRole) {
                await showClinicOnboarding();
                return;
            }

            if (user.profesional_id) return;

            if (user.paciente_id) {
                checkPendingRedirect();
                return;
            }

            try {
                const perfilPorUser = await patientService.getMyProfile(user.user_id || user.id);
                if (perfilPorUser?.id) {
                    await authService.updateUser(user.user_id || user.id, { paciente_id: perfilPorUser.id });
                    if (setUser) {
                        setUser({ ...user, paciente_id: perfilPorUser.id });
                    }
                    checkPendingRedirect();
                    return;
                }

                const syncResponse = await patientService.vincularExistente({
                    documento: user.documento,
                    user_id: user.user_id || user.id
                });

                if (syncResponse.status === 'found') {
                    console.log("Perfil recuperado. Vinculando...");
                    await authService.updateUser(user.user_id || user.id, { paciente_id: syncResponse.paciente_id });
                    if (setUser) {
                        setUser({ ...user, paciente_id: syncResponse.paciente_id });
                    }
                    checkPendingRedirect();
                }

            } catch (error) {
                if (error.response && error.response.status === 404) {
                    showRegistrationModal();
                } else {
                    console.error("Error de verificación:", error);
                }
            }
        };

        verificarEstado();
    }, [user, setUser, checkPendingRedirect, showRegistrationModal, hasAdminRole, showClinicOnboarding]);

    return null; 
};

export default PatientOnboarding;

