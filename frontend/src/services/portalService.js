import api from '../api/axiosConfig';

export const portalService = {
    // 1. Obtener Banners (Público)
    getBanners: async () => {
        try {
            const response = await api.get('/portal/banners/');
            return response.data;
        } catch (error) {
            console.error("Error cargando banners:", error);
            return [];
        }
    },

    // 2. Obtener Videos (Público)
    getVideos: async () => {
        try {
            const response = await api.get('/portal/videos/');
            return response.data;
        } catch (error) {
            console.error("Error cargando videos:", error);
            return [];
        }
    },

    // 3. Enviar PQRS (POST)
    createPQRS: async (formData) => {
        const response = await api.post('/portal/pqrs/', formData);
        return response.data;
    },

    // 4. Enviar Hoja de Vida (POST - Multipart por el archivo)
    createHV: async (formData) => {
        const response = await api.post('/portal/trabaje-con-nosotros/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Vital para subir archivos
            },
        });
        return response.data;
    }
};