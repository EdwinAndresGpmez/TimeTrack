import api from '../api/axiosConfig';

export const authService = {
    // Registro (Este lo dejamos igual, ya estaba enviando 'documento')
    register: async (userData) => {
        const payload = {
            nombre: userData.nombre,
            username: userData.username,
            email: userData.correo,
            correo: userData.correo,
            tipo_documento: userData.tipo_documento,
            documento: userData.documento,
            numero: userData.numero,
            password: userData.password,
            acepta_tratamiento_datos: userData.acepta_tratamiento_datos
        };

        try {
            const response = await api.post('/auth/register/', payload);
            return response.data;
        } catch (error) {
            console.error("Error en registro:", error.response?.data);
            throw error.response ? error.response.data : { detail: "Error de conexión con el servidor" };
        }
    },

    // --- AQUÍ ESTÁ EL CAMBIO ---
    login: async (credentials) => {
        try {
            const response = await api.post('/auth/login/', {
                documento: credentials.documento, 
                password: credentials.password
            });
            
            if (response.data.access) {
                localStorage.setItem('token', response.data.access);
                localStorage.setItem('refresh', response.data.refresh);
            }
            return response.data;
        } catch (error) {
            // Manejo de error mejorado para ver qué devuelve el backend
            console.error("Error Login:", error.response?.data);
            throw error.response ? error.response.data : { detail: "Credenciales incorrectas" };
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
    }
};