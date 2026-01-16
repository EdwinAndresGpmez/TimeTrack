import api from '../api/axiosConfig';

// Ruta base según Nginx y tu urls.py
const BASE_URL = '/pacientes'; 

export const patientService = {
    // Buscar mi perfil usando el ID del login
    getMyProfile: async (userId) => {
        // Tu endpoint es /listado/
        const response = await api.get(`${BASE_URL}/listado/?user_id=${userId}`);
        return response.data.length > 0 ? response.data[0] : null;
    },

    // Crear perfil
    create: async (data) => {
        const response = await api.post(`${BASE_URL}/listado/`, data);
        return response.data;
    },

    // Actualizar perfil
    update: async (id, data) => {
        const response = await api.patch(`${BASE_URL}/listado/${id}/`, data);
        return response.data;
    },

    // Obtener tipos de paciente (EPS, Particular, etc.)
    getTipos: async () => {
        const response = await api.get(`${BASE_URL}/tipos/`);
        return response.data;
    }
};