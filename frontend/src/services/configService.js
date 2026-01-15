import api from '../api/axiosConfig';

// Endpoint base
const BASE_URL = '/citas/configuracion'; 

export const configService = {
    // Obtener la configuración actual (Siempre ID 1)
    getConfig: async () => {
        const response = await api.get(`${BASE_URL}/1/`); 
        return response.data; // Devuelve objeto { id: 1, horas_antelacion_cancelar: 24, ... }
    },

    // Actualizar reglas
    updateConfig: async (data) => {
        const response = await api.patch(`${BASE_URL}/1/`, data);
        return response.data;
    }
};