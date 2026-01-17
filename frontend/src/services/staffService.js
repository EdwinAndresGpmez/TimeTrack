import api from '../api/axiosConfig';

export const staffService = {
    // MODIFICAMOS LOS GETTERS PARA ACEPTAR 'params'
    
    // 1. PROFESIONALES
    getProfesionales: async (params = {}) => {
        const response = await api.get('/staff/profesionales/', { params });
        return response.data;
    },

    // 2. ESPECIALIDADES
    getEspecialidades: async (params = {}) => {
        const response = await api.get('/staff/especialidades/', { params });
        return response.data;
    },

    // 3. LUGARES / SEDES
    getLugares: async (params = {}) => {
        const response = await api.get('/staff/lugares/', { params });
        return response.data;
    },

    // 4. SERVICIOS
    getServicios: async (params = {}) => {
        const response = await api.get('/staff/servicios/', { params });
        return response.data;
    },

    // --- ESCRITURA (Create, Update, Delete se mantienen igual) ---
    createProfesional: async (data) => (await api.post('/staff/profesionales/', data)).data,
    updateProfesional: async (id, data) => (await api.patch(`/staff/profesionales/${id}/`, data)).data,
    toggleActivo: async (id, estadoActual) => (await api.patch(`/staff/profesionales/${id}/`, { activo: !estadoActual })).data,
    
    createEspecialidad: async (data) => (await api.post('/staff/especialidades/', data)).data,
    updateEspecialidad: async (id, data) => (await api.patch(`/staff/especialidades/${id}/`, data)).data,
    deleteEspecialidad: async (id) => (await api.delete(`/staff/especialidades/${id}/`)).data,

    createLugar: async (data) => (await api.post('/staff/lugares/', data)).data,
    updateLugar: async (id, data) => (await api.patch(`/staff/lugares/${id}/`, data)).data,
    deleteLugar: async (id) => (await api.delete(`/staff/lugares/${id}/`)).data,

    createServicio: async (data) => (await api.post('/staff/servicios/', data)).data,
    updateServicio: async (id, data) => (await api.patch(`/staff/servicios/${id}/`, data)).data,
    deleteServicio: async (id) => (await api.delete(`/staff/servicios/${id}/`)).data,
};