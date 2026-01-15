import api from '../api/axiosConfig';

// Rutas base según Nginx
const BASE_URL = '/staff'; 

export const staffService = {
    // Obtener todos los servicios activos
    getServicios: async () => {
        const response = await api.get(`${BASE_URL}/servicios/`);
        return response.data;
    },

    // Obtener todas las sedes
    getLugares: async () => {
        const response = await api.get(`${BASE_URL}/lugares/`);
        return response.data;
    },

    // Obtener profesionales (Opcional: Filtrar por servicio ID)
    getProfesionales: async (servicioId = null) => {
        let url = `${BASE_URL}/profesionales/`;
        // Usamos el filtro que configuramos en el Backend: ?servicio=1
        if (servicioId) {
            url += `?servicio=${servicioId}`;
        }
        const response = await api.get(url);
        return response.data;
    }
};