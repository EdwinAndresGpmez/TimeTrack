import api from '../api/axiosConfig';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, retries = 1) {
    try {
        return await fn();
    } catch (e) {
        if (retries <= 0) throw e;
        await sleep(350);
        return withRetry(fn, retries - 1);
    }
}

export const patientService = {
    getAll: async (params = {}) => {
        const response = await api.get('/pacientes/listado/', { params });
        return response.data;
    },

    getPatientById: async (id) => {
        const response = await api.get(`/pacientes/listado/${id}/`);
        return response.data;
    },

    create: async (patientData) => {
        const response = await api.post('/pacientes/listado/', patientData);
        return response.data;
    },

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

    update: async (id, data) => {
        const response = await api.patch(`/pacientes/listado/${id}/`, data);
        return response.data;
    },

    getTiposPaciente: async () => {
        const response = await api.get('/pacientes/tipos/');
        return response.data;
    },

    createTipoPaciente: async (data) => {
        const response = await api.post('/pacientes/tipos/', data);
        return response.data;
    },

    updateTipoPaciente: async (id, data) => {
        const response = await api.patch(`/pacientes/tipos/${id}/`, data);
        return response.data;
    },

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

    vincularExistente: async (data) => {
        const response = await api.post('/pacientes/internal/sync-user/', data);
        return response.data;
    },

    crearSolicitudValidacion: async (data) => {
        const response = await api.post('/pacientes/solicitudes/', data);
        return response.data;
    },

    getSolicitudesPendientes: async () => {
        return withRetry(async () => {
            const response = await api.get('/pacientes/solicitudes/', {
                params: { procesado: false },
                timeout: 8000,
            });
            return response.data;
        }, 1);
    },

    updateSolicitud: async (id, data) => {
        const response = await api.patch(`/pacientes/solicitudes/${id}/`, data);
        return response.data;
    },

    deleteSolicitud: async (id) => {
        const response = await api.delete(`/pacientes/solicitudes/${id}/`);
        return response.data;
    },

    resetInasistencias: async (id) => {
        const response = await api.post(`/pacientes/listado/${id}/reset-inasistencias/`);
        return response.data;
    }
};
