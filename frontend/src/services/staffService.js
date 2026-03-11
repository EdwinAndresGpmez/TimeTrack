import api from '../api/axiosConfig';

export const staffService = {
    
    getProfesionales: async (params = {}) => {
        const response = await api.get('/staff/profesionales/', { params });
        return response.data;
    },

    getEspecialidades: async (params = {}) => {
        const response = await api.get('/staff/especialidades/', { params });
        return response.data;
    },

    getLugares: async (params = {}) => {
        const response = await api.get('/staff/lugares/', { params });
        return response.data;
    },

    getServicios: async (params = {}) => {
        const response = await api.get('/staff/servicios/', { params });
        return response.data;
    },

    createProfesional: async (data) => (await api.post('/staff/profesionales/', data)).data,
    updateProfesional: async (id, data) => (await api.patch(`/staff/profesionales/${id}/`, data)).data,
    toggleActivo: async (id, estadoActual) => (await api.patch(`/staff/profesionales/${id}/`, { activo: !estadoActual })).data,
    
    createEspecialidad: async (data) => (await api.post('/staff/especialidades/', data)).data,
    updateEspecialidad: async (id, data) => (await api.patch(`/staff/especialidades/${id}/`, data)).data,
    deleteEspecialidad: async (id) => (await api.delete(`/staff/especialidades/${id}/`)).data,

    createLugar: async (data) => (await api.post('/staff/lugares/', data)).data,
    updateLugar: async (id, data) => (await api.patch(`/staff/lugares/${id}/`, data)).data,
    deleteLugar: async (id) => (await api.delete(`/staff/lugares/${id}/`)).data,
    importLugaresMasivo: async (rows, skipDuplicates = true) =>
        (await api.post('/staff/lugares/import-masivo/', { rows, skip_duplicates: skipDuplicates })).data,

    createServicio: async (data) => (await api.post('/staff/servicios/', data)).data,
    updateServicio: async (id, data) => (await api.patch(`/staff/servicios/${id}/`, data)).data,
    deleteServicio: async (id) => (await api.delete(`/staff/servicios/${id}/`)).data,
};

