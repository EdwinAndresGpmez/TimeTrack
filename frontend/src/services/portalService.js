import api from '../api/axiosConfig';

export const portalService = {
    getPublicPolicy: async () => {
        const response = await api.get('/portal/policy/');
        return response.data;
    },

    getBanners: async () => {
        try {
            const response = await api.get('/portal/banners/');
            return response.data;
        } catch (error) {
            console.error("Error cargando banners:", error);
            return [];
        }
    },

    getVideos: async () => {
        try {
            const response = await api.get('/portal/videos/');
            return response.data;
        } catch (error) {
            console.error("Error cargando videos:", error);
            return [];
        }
    },

    createPQRS: async (formData) => {
        const response = await api.post('/portal/pqrs/', formData);
        return response.data;
    },

    createHV: async (formData) => {
        const response = await api.post('/portal/trabaje-con-nosotros/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Vital para subir archivos
            },
        });
        return response.data;
    },

    getAdminPQRS: async () => {
        const response = await api.get('/portal/admin/pqrs/');
        return response.data;
    },
    updateAdminPQRS: async (id, payload) => {
        const response = await api.patch(`/portal/admin/pqrs/${id}/`, payload);
        return response.data;
    },

    getAdminConvocatorias: async () => {
        const response = await api.get('/portal/admin/convocatorias/');
        return response.data;
    },
    updateAdminConvocatoria: async (id, payload) => {
        const response = await api.patch(`/portal/admin/convocatorias/${id}/`, payload);
        return response.data;
    }
};


