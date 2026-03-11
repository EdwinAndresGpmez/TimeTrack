import api from '../api/axiosConfig';

export const agendaService = {
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

    duplicateSchedule: async (payload) => {
        const response = await api.post(`/agenda/disponibilidad/duplicar_dia/`, payload);
        return response.data;
    },

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

    getSlots: async (profesionalId, fecha, duracion = 20, servicioId = null) => {
        const params = { 
            profesional_id: profesionalId, 
            fecha: fecha,
            duracion_minutos: duracion
        };

        if (servicioId) {
            params.servicio_id = servicioId;
        }

        const response = await api.get('/agenda/slots/', { params });
        return response.data;
    }
};
