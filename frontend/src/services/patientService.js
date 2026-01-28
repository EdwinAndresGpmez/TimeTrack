import api from '../api/axiosConfig';

export const patientService = {
    // 1. Obtener TODOS los pacientes (Para AdminUsuarios)
    getAll: async (params = {}) => {
        // Al pasar { params }, Axios construye la URL así: 
        // /pacientes/listado/?search=texto&admin_mode=true
        const response = await api.get('/pacientes/listado/', { params });
        return response.data;
    },

    getPatientById: async (id) => {
        const response = await api.get(`/pacientes/listado/${id}/`);
        return response.data;
    },

    // 2. Crear Perfil de Paciente
    create: async (patientData) => {
        const response = await api.post('/pacientes/listado/', patientData);
        return response.data;
    },

    // 3. Obtener Mi Perfil (Lógica existente)
    getMyProfile: async (userId) => {
        try {
            const response = await api.get(`/pacientes/listado/?user_id=${userId}`);
            if (Array.isArray(response.data) && response.data.length > 0) {
                return response.data[0];
            }
            return null;
        } catch (error) {
            console.error("Error obteniendo perfil:", error);
            return null;
        }
    },

    // 4. Actualizar Perfil (Unificado)
    update: async (id, data) => {
        const response = await api.patch(`/pacientes/listado/${id}/`, data);
        return response.data;
    },

    // 5. Obtener Tipos de Paciente (EPS, Particular, etc.)
    getTiposPaciente: async () => {
        const response = await api.get('/pacientes/tipos/');
        return response.data;
    },

    // 6. Buscar perfil por ID de Usuario (Para AdminUsuarios)
    getProfileByUserId: async (userId) => {
        try {
            const response = await api.get(`/pacientes/listado/?user_id=${userId}`);
            if (response.data && response.data.length > 0) {
                return response.data[0];
            }
            return null;
        } catch (error) {
            console.error("Error buscando perfil de paciente:", error);
            return null;
        }
    },

    // 7. Vincular Usuario Existente (Sync)
    vincularExistente: async (data) => {
        const response = await api.post('/pacientes/internal/sync-user/', data);
        return response.data;
    },

    // --- FUNCIONES ADMINISTRATIVAS ---
    
    crearSolicitudValidacion: async (data) => {
        const response = await api.post('/pacientes/solicitudes/', data);
        return response.data;
    },

    getSolicitudesPendientes: async () => {
        const response = await api.get('/pacientes/solicitudes/?procesado=false');
        return response.data;
    },

    // Actualizar una solicitud (marcar procesada, corregir campos, etc.)
    updateSolicitud: async (id, data) => {
        const response = await api.patch(`/pacientes/solicitudes/${id}/`, data);
        return response.data;
    },

    // Borrar una solicitud si lo deseas
    deleteSolicitud: async (id) => {
        const response = await api.delete(`/pacientes/solicitudes/${id}/`);
        return response.data;
    },

    // 8. NUEVO: Resetear Inasistencias (Fecha de Corte)
    // Este es el método que faltaba para el botón de desbloqueo
    resetInasistencias: async (id) => {
        const response = await api.post(`/pacientes/listado/${id}/reset-inasistencias/`);
        return response.data;
    }
};