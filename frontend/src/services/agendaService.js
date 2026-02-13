import api from '../api/axiosConfig';

export const agendaService = {
    // --- DISPONIBILIDAD (Horarios Base) ---
    getDisponibilidades: async (params = {}) => {
        // params: { profesional_id, lugar_id, fecha, etc }
        const response = await api.get('/agenda/disponibilidad/', { params });
        return response.data;
    },

    createDisponibilidad: async (data) => {
        // data incluye: fecha_inicio_vigencia, fecha_fin_vigencia, etc.
        const response = await api.post('/agenda/disponibilidad/', data);
        return response.data;
    },

    deleteDisponibilidad: async (id) => {
        // AHORA ESTO ES INTELIGENTE:
        // Si es recurrente -> El backend corta la vigencia (Soft Delete).
        // Si es fecha única -> El backend borra el registro (Hard Delete).
        const response = await api.delete(`/agenda/disponibilidad/${id}/`);
        return response.data;
    },

    duplicateSchedule: async (payload) => {
        // payload: { profesional_id, lugar_id, fecha_origen, fecha_destino }
        const response = await api.post(`/agenda/disponibilidad/duplicar_dia/`, payload);
        return response.data;
    },

    // --- BLOQUEOS (Excepciones / "Solo por hoy") ---
    getBloqueos: async (params = {}) => {
        const response = await api.get('/agenda/bloqueos/', { params });
        return response.data;
    },

    createBloqueo: async (data) => {
        // Se usa cuando das click en "Ocultar SOLO por hoy"
        const response = await api.post('/agenda/bloqueos/', data);
        return response.data;
    },

    deleteBloqueo: async (id) => {
        const response = await api.delete(`/agenda/bloqueos/${id}/`);
        return response.data;
    },

    // --- MOTOR DE SLOTS (Para Nueva Cita) ---
    // Agregué servicioId opcional para mayor precisión
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