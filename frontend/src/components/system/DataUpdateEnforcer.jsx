import React, { useEffect, useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import { configService } from '../../services/configService';
import { authService } from '../../services/authService';
import Swal from 'sweetalert2';

const DataUpdateEnforcer = ({ onValidated }) => {
    const { user } = useContext(AuthContext);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        // Solo ejecutar si hay usuario, es paciente y no hemos chequeado ya en esta sesión de componente
        if (user && user.paciente_id && !checked) {
            verificarAntiguedadDatos();
        }
    }, [user, checked]);

    const verificarAntiguedadDatos = async () => {
        setChecked(true); // Marcamos como chequeado para no repetir
        try {
            // 1. Obtenemos configuración y perfil en paralelo
            const [config, perfil] = await Promise.all([
                configService.getConfig(),
                patientService.getPatientById(user.paciente_id)
            ]);

            const diasLimite = config.dias_para_actualizar_datos || 180; // Default 6 meses
            if (diasLimite === 0) {
                if (onValidated) onValidated(); // Si la regla está apagada, dejar pasar
                return; 
            }

            // 2. Calcular días transcurridos desde updated_at
            const ultimaActualizacion = new Date(perfil.updated_at);
            const hoy = new Date();
            const diferenciaTiempo = Math.abs(hoy - ultimaActualizacion);
            const diasTranscurridos = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

            // 3. Validar
            if (diasTranscurridos > diasLimite) {
                lanzarModalActualizacion(perfil, diasTranscurridos);
            } else {
                if (onValidated) onValidated(); // Datos vigentes
            }

        } catch (error) {
            console.error("Error verificando antiguedad de datos:", error);
            if (onValidated) onValidated(); // En caso de error técnico, no bloqueamos al usuario
        }
    };

    const lanzarModalActualizacion = (datosActuales, dias) => {
        Swal.fire({
            title: 'Actualización Requerida',
            html: `
                <div class="text-left text-sm text-gray-600">
                    <p class="mb-4">
                        Para agendar tu cita, necesitamos confirmar tus datos de contacto. 
                        No actualizas tu información hace más de <strong>${dias} días</strong>.
                    </p>
                    
                    <label class="block font-bold mt-2 text-gray-700">Teléfono Celular *</label>
                    <input id="upd-tel" class="swal2-input m-0 w-full" placeholder="Ej: 3001234567" value="${datosActuales.telefono || ''}">
                    
                    <label class="block font-bold mt-3 text-gray-700">Dirección de Residencia *</label>
                    <input id="upd-dir" class="swal2-input m-0 w-full" placeholder="Ej: Cra 1 # 2-3" value="${datosActuales.direccion || ''}">
                    
                    <label class="block font-bold mt-3 text-gray-700">Correo Electrónico *</label>
                    <input id="upd-email" class="swal2-input m-0 w-full" placeholder="ejemplo@correo.com" value="${datosActuales.email_contacto || ''}">
                </div>
            `,
            icon: 'info',
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: 'Confirmar y Continuar',
            confirmButtonColor: '#2563eb',
            preConfirm: () => {
                const telefono = document.getElementById('upd-tel').value;
                const direccion = document.getElementById('upd-dir').value;
                const email = document.getElementById('upd-email').value;

                if (!telefono || !direccion || !email) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                    return false;
                }
                return { telefono, direccion, email };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { telefono, direccion, email } = result.value;
                
                try {
                    Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

                    // A. Actualizar PACIENTE (Datos demográficos)
                    // Esto actualiza automáticamente el campo updated_at en BD
                    await patientService.update(datosActuales.id, {
                        telefono,
                        direccion,
                        email_contacto: email
                    });

                    // B. Actualizar USUARIO (Datos de acceso/auth)
                    if (datosActuales.user_id) {
                        await authService.updateUser(datosActuales.user_id, {
                            telefono, 
                            email 
                        });
                    }

                    await Swal.fire({
                        icon: 'success',
                        title: '¡Datos Actualizados!',
                        text: 'Gracias por mantener tu información al día.',
                        timer: 1500,
                        showConfirmButton: false
                    });

                    if (onValidated) onValidated();

                } catch (error) {
                    console.error(error);
                    Swal.fire('Error', 'No se pudo actualizar. Inténtalo nuevamente.', 'error')
                        .then(() => lanzarModalActualizacion(datosActuales, dias)); // Reintentar si falla
                }
            }
        });
    };

    return null; // Componente lógico, no visual
};

export default DataUpdateEnforcer;