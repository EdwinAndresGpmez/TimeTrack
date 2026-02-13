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

    getReporteInasistencias: async () => {
        const response = await api.get('/citas/reportes/inasistencias/');
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

    // --- CORRECCIÓN MEJORADA ---
    updateEstado: async (id, data) => {
        try {
            // Lógica Inteligente:
            // 1. Si 'data' es un STRING (ej: "EN_SALA"), lo envolvemos en un objeto JSON.
            // 2. Si 'data' ya es un OBJETO (ej: { estado: "REALIZADA", nota_interna: "..." }), lo enviamos tal cual.
            
            const payload = typeof data === 'string' ? { estado: data } : data;
            
            const response = await api.patch(`${BASE_URL}/${id}/`, payload);
            return response.data;
        } catch (error) {
            // Esto imprimirá en la consola del navegador la razón exacta del error 400
            // Ej: "La cita ya pasó" o "El estado 'Finalizado' no es válido"
            console.error("❌ Error en updateEstado:", error.response?.data);
            throw error; // Re-lanzamos para que el componente (AdminCitas) pueda mostrar la alerta
        }
    }
};