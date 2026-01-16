import axios from 'axios';

// 1. Crear instancia base
const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1',
});

// 2. Interceptor de Solicitud
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Interceptor de Respuesta
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Sesión expirada o inválida. Cerrando sesión...");
            localStorage.removeItem('token');
            localStorage.removeItem('refresh');
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

export default api;
