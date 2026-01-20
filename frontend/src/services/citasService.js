import api from '../api/axiosConfig';

const BASE_URL = '/citas'; 

export const citasService = {
    // Obtener citas con filtros (fecha, estado, paciente_id, etc.)
    getAll: async (params = {}) => {
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

    // Actualización genérica (Sirve para cambiar estado, agregar nota_interna, etc.)
    update: async (id, data) => {
        const response = await api.patch(`${BASE_URL}/${id}/`, data);
        return response.data;
    },

    // Método legacy o específico solo para cancelar
    cancel: async (id) => {
        const response = await api.patch(`${BASE_URL}/${id}/`, { estado: 'CANCELADA' });
        return response.data;
    },

    // --- HELPER PARA HISTORIAL ---
    // Trae las citas de un paciente ordenadas por fecha descendente
    getHistorialPaciente: async (pacienteId) => {
        try {
            const response = await api.get(`${BASE_URL}/`, { 
                params: { 
                    paciente_id: pacienteId,
                    ordering: '-fecha,-hora_inicio' 
                } 
            });
            return response.data;
        } catch (error) {
            console.error("Error obteniendo historial", error);
            return []; // Retorna array vacío para no romper el map en el front
        }
    }
};