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

    // 5. Obtener Menú Dinámico (Para el Sidebar)
    getMenu: async () => {
        const response = await api.get('/auth/menu/');
        return response.data;
    },

    // 6. Obtener Roles y Permisos (Mios)
    getMisPermisos: async () => {
        const response = await api.get('/auth/me/permisos/');
        return response.data;
    },

    // --- GESTIÓN DE USUARIOS (ADMIN) ---

    getAllUsers: async (search = '') => {
        const response = await api.get(`/users/admin/users/?search=${search}`);
        return response.data;
    },

    updateUserAdmin: async (id, data) => {
        const response = await api.patch(`/users/admin/users/${id}/`, data);
        return response.data;
    },

    toggleUserStatus: async (id, isActive) => {
        const response = await api.patch(`/users/admin/users/${id}/`, { is_active: isActive });
        return response.data;
    },

    deleteUser: async (id) => {
        await api.delete(`/users/admin/users/${id}/`);
    },

    adminChangePassword: async (id, password) => {
        const response = await api.post(`/users/admin/users/${id}/change_password/`, { password });
        return response.data;
    },

    // --- GESTIÓN DE MENÚS Y PERMISOS (ADMIN MENU) ---

    // Obtener todos los items del menú para editar
    getMenuItemsAdmin: async () => {
        const response = await api.get('/users/admin/menu-items/');
        return response.data;
    },

    // Actualizar un item del menú (orden, icono, roles)
    updateMenuItemAdmin: async (id, data) => {
        const response = await api.patch(`/users/admin/menu-items/${id}/`, data);
        return response.data;
    },

    // Obtener todos los permisos de vista (Codenames)
    getPermisosVistaAdmin: async () => {
        const response = await api.get('/users/admin/permisos-vista/');
        return response.data;
    },

    // Actualizar roles de un permiso de vista
    updatePermisoVistaAdmin: async (id, data) => {
        const response = await api.patch(`/users/admin/permisos-vista/${id}/`, data);
        return response.data;
    },

    // Obtener grupos/roles disponibles en el sistema (Administrador, Paciente, etc)
    getGroups: async () => {
        // Debe coincidir con router.register(r"admin/groups", ...)
        const response = await api.get('/users/admin/groups/');
        return response.data;
    },

    createMenuItem: async (data) => {
        const response = await api.post('/users/admin/menu-items/', data);
        return response.data;
    },
    createPermisoVista: async (data) => {
        const response = await api.post('/users/admin/permisos-vista/', data);
        return response.data;
    },

    deleteMenuItem: async (id) => {
        return await api.delete(`/users/admin/menu-items/${id}/`);
    },
    deletePermisoVista: async (id) => {
        await api.delete(`/users/admin/permisos-vista/${id}/`);
    },
    getBranding: async () => {
        const response = await api.get('/users/admin/branding/');
        return response.data;
    },

    updateBranding: async (data) => {
        const response = await api.patch('/users/admin/branding/', data);
        return response.data;
    },
};