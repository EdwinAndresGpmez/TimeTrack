import api from '../api/axiosConfig';

export const authService = {
    // 1. Registro
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

    // 2. Login
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
            console.error("Error Login:", error.response?.data);
            throw error.response ? error.response.data : { detail: "Credenciales incorrectas" };
        }
    },

    // 3. Logout
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        localStorage.removeItem('intencionCita');
    },

    // 4. Actualizar MI Propio Perfil
    updateUser: async (id, data) => {
        const response = await api.patch('/auth/me/', data);
        return response.data;
    },

    // 5. Obtener Menú Dinámico
    getMenu: async () => {
        const response = await api.get('/auth/menu/');
        return response.data;
    },

    // 6. Obtener Roles y Permisos (CORREGIDO EL NOMBRE)
    getMisPermisos: async () => {
        const response = await api.get('/auth/me/permisos/');
        return response.data;
    },

    // --- FUNCIONES DE ADMINISTRADOR ---

    getAllUsers: async () => {
        const response = await api.get('/users/admin/users/');
        return response.data;
    },

    // CORREGIDO: Renombrado para evitar conflicto con la función de arriba
    adminUpdateUser: async (id, data) => {
        const response = await api.patch(`/users/admin/users/${id}/`, data);
        return response.data;
    },

    deleteUser: async (id) => {
        await api.delete(`/users/admin/users/${id}/`);
    },

    adminChangePassword: async (id, password) => {
        const response = await api.post(`/users/admin/users/${id}/change_password/`, { password });
        return response.data;
    },

    getGroups: async () => {
        const response = await api.get('/users/admin/users/groups/');
        return response.data;
    }
};