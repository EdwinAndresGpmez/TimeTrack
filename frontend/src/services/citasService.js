import api from '../api/axiosConfig'; // <--- Usamos esta instancia configurada

const BASE_URL = '/citas'; 

export const citasService = {
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

    getReporteInasistencias: async () => {
        const response = await api.get('/citas/reportes/inasistencias/');
        return response.data;
    },

    getDashboardResumen: async () => {
        const response = await api.get('/citas/reportes/dashboard-resumen/');
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

    updateEstado: async (id, data) => {
        try {
            
            const payload = typeof data === 'string' ? { estado: data } : data;
            
            const response = await api.patch(`${BASE_URL}/${id}/`, payload);
            return response.data;
        } catch (error) {
              const status = error?.response?.status;
              const data = error?.response?.data;
                    
              console.error("❌ Error en updateEstado status:", status);
              console.error("❌ Error en updateEstado data:", data);
              console.error("❌ Error en updateEstado data JSON:", JSON.stringify(data, null, 2));
                    
              throw error;
            }
    }
};

