import api from '../api/axiosConfig'; // <--- Usamos esta instancia configurada

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

  
    update: async (id, data) => {
        const response = await api.patch(`${BASE_URL}/${id}/`, data);
        return response.data;
    },

    cancel: async (id) => {
        const response = await api.patch(`${BASE_URL}/${id}/`, { estado: 'CANCELADA' });
        return response.data;
    },

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
            return [];
        }
    },

    // --- CORRECCIÓN AQUÍ ---
    updateEstado: async (id, nuevoEstado) => {
        // Construimos el objeto JSON aquí para asegurar que siempre sea correcto
        const payload = { estado: nuevoEstado };
        
        const response = await api.patch(`${BASE_URL}/${id}/`, payload);
        return response.data;
    },
};