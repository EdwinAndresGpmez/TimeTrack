import api from '../api/axiosConfig';

export const patientService = {
    // 1. Crear Perfil de Paciente
    create: async (patientData) => {
        const response = await api.post('/pacientes/listado/', patientData);
        return response.data;
    },

    // 2. Obtener Mi Perfil (para el usuario logueado)
    getMyProfile: async (userId) => {
        try {
            // Filtramos por user_id
            const response = await api.get(`/pacientes/listado/?user_id=${userId}`);
            // Si devuelve una lista, tomamos el primero
            if (Array.isArray(response.data) && response.data.length > 0) {
                return response.data[0];
            }
            return null;
        } catch (error) {
            console.error("Error obteniendo perfil:", error);
            return null;
        }
    },

    // 3. Actualizar Perfil
    update: async (id, data) => {
        const response = await api.put(`/pacientes/listado/${id}/`, data);
        return response.data;
    },

    // 4. Obtener Tipos de Paciente (EPS, Prepagada, etc.)
    getTipos: async () => {
        const response = await api.get('/pacientes/tipos/');
        return response.data;
    },

    // 5. Vincular Usuario Existente (Self-Healing)
    vincularExistente: async (data) => {
        const response = await api.post('/pacientes/internal/sync-user/', data);
        return response.data;
    },

    // --- FUNCIONES ADMINISTRATIVAS (NUEVAS) ---

    // 6. Crear/Actualizar Solicitud de Validación
    // Se usa tanto para que el usuario pida validación, como para que el admin la marque "procesada"
    crearSolicitudValidacion: async (data) => {
        const response = await api.post('/pacientes/solicitudes/', data);
        return response.data;
    },

    // 7. Obtener Solicitudes Pendientes (Admin)
    // Esta es la que faltaba y causaba el error
    getSolicitudesPendientes: async () => {
        const response = await api.get('/pacientes/solicitudes/?procesado=false');
        return response.data;
    },

    updateSolicitud: async (id, data) => {
        const response = await api.put(`/pacientes/solicitudes/${id}/`, data);
        return response.data;
    }
};