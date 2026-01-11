import axios from 'axios';

// 1. Instancia Base
const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor de Solicitud (El que ya tienes - ESTÁ BIEN)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Interceptor de Respuesta (AGREGA ESTO)
// Esto sirve para que si el Backend dice "Tu token no sirve" (401),
// la app no se quede trabada creyendo que sigue logueada.
api.interceptors.response.use(
  (response) => response, // Si todo sale bien, deja pasar la respuesta
  (error) => {
    // Si el error es 401 (No autorizado / Token vencido)
    if (error.response && error.response.status === 401) {
      console.warn("Sesión expirada o inválida. Cerrando sesión...");
      
      // Limpiamos la basura local
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Opcional: Forzar recarga a la página de login si es crítico
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;