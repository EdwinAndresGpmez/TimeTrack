import api from '../api/axiosConfig';

export const agendaService = {
    // --- DISPONIBILIDAD (Horarios Base) ---
    getDisponibilidades: async (params = {}) => {
        const response = await api.get('/agenda/disponibilidad/', { params });
        return response.data;
    },
    createDisponibilidad: async (data) => {
        const response = await api.post('/agenda/disponibilidad/', data);
        return response.data;
    },
    deleteDisponibilidad: async (id) => {
        const response = await api.delete(`/agenda/disponibilidad/${id}/`);
        return response.data;
    },

    // --- BLOQUEOS (Excepciones) ---
    getBloqueos: async (params = {}) => {
        const response = await api.get('/agenda/bloqueos/', { params });
        return response.data;
    },
    createBloqueo: async (data) => {
        const response = await api.post('/agenda/bloqueos/', data);
        return response.data;
    },
    deleteBloqueo: async (id) => {
        const response = await api.delete(`/agenda/bloqueos/${id}/`);
        return response.data;
    },

    // --- MOTOR DE SLOTS (Para Nueva Cita) ---
    getSlots: async (profesionalId, fecha, duracion = 30) => {
        const response = await api.get('/agenda/slots/', { 
            params: { 
                profesional_id: profesionalId, 
                fecha: fecha,
                duracion_minutos: duracion
            } 
        });
        return response.data;
    }
};