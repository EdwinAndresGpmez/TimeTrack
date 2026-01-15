import api from '../api/axiosConfig';

// El Gateway (Nginx) redirigirá '/api/citas' -> 'appointments-ms/api/v1/citas'
const BASE_URL = '/citas'; 

export const citasService = {
    // 1. Listar (Equivalente a inicio() del legado)
    getAll: async () => {
        const response = await api.get(`${BASE_URL}/`);
        return response.data;
    },

    // 2. Obtener detalle
    getById: async (id) => {
        const response = await api.get(`${BASE_URL}/${id}/`);
        return response.data;
    },

    // 3. Crear (Equivalente a cita() del legado)
    create: async (citaData) => {
        const response = await api.post(`${BASE_URL}/`, citaData);
        return response.data;
    },

    // 4. Cancelar (Lógica de negocio: No se borra, se cambia estado)
    cancel: async (id) => {
        // Enviamos solo el cambio de estado
        const response = await api.patch(`${BASE_URL}/${id}/`, { 
            estado: 'CANCELADA' 
        });
        return response.data;
    }
};