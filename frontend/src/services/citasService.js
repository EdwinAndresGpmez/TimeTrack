import api from '../api/axiosConfig';

const BASE_URL = '/citas'; 

export const citasService = {
    getAll: async (params = {}) => {
        // Ahora aceptamos params para filtrar por fecha/estado
        const response = await api.get(`${BASE_URL}/`, { params });
        return response.data;
    },
    
    getById: async (id) => {
        const response = await api.get(`${BASE_URL}/${id}/`);
        return response.data;
    },

    create: async (citaData) => {
        const response = await api.post(`${BASE_URL}/`, citaData);
        return response.data;
    },

    cancel: async (id) => {
        const response = await api.patch(`${BASE_URL}/${id}/`, { estado: 'CANCELADA' });
        return response.data;
    },

    // --- NUEVO MÉTODO PARA ADMIN ---
    updateEstado: async (id, nuevoEstado) => {
        const response = await api.patch(`${BASE_URL}/${id}/`, { estado: nuevoEstado });
        return response.data;
    }
};