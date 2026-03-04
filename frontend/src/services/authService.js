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
      acepta_tratamiento_datos: userData.acepta_tratamiento_datos,
    };

    try {
      const response = await api.post('/auth/register/', payload);
      return response.data;
    } catch (error) {
      console.error('Error en registro:', error.response?.data || error.message);
      // Si no hay response, suele ser CORS/red
      if (!error.response) {
        throw { detail: 'Error de conexión con el servidor (CORS/red).' };
      }
      throw error.response.data;
    }
  },

  // 2. Login
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login/', {
        documento: credentials.documento,
        password: credentials.password,
      });

      if (response.data?.access) {
        // ✅ recomendado
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);

        // ✅ compatibilidad (si otros módulos aún usan token)
        localStorage.setItem('token', response.data.access);
      }

      return response.data;
    } catch (error) {
      console.error('Error Login:', error.response?.data || error.message);
      if (!error.response) {
        throw { detail: 'Error de conexión con el servidor (CORS/red).' };
      }
      // si el backend manda detail, lo respetamos
      throw error.response.data || { detail: 'Credenciales incorrectas' };
    }
  },

  // 3. Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    localStorage.removeItem('intencionCita');
  },

  // 4. Actualizar MI Propio Perfil
  updateUser: async (_id, data) => {
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
  getMenuItemsAdmin: async () => {
    const response = await api.get('/users/admin/menu-items/');
    return response.data;
  },

  updateMenuItemAdmin: async (id, data) => {
    const response = await api.patch(`/users/admin/menu-items/${id}/`, data);
    return response.data;
  },

  getPermisosVistaAdmin: async () => {
    const response = await api.get('/users/admin/permisos-vista/');
    return response.data;
  },

  updatePermisoVistaAdmin: async (id, data) => {
    const response = await api.patch(`/users/admin/permisos-vista/${id}/`, data);
    return response.data;
  },

  getGroups: async () => {
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

  getRedFamiliar: async (id) => {
    const response = await api.get(`/users/admin/users/${id}/red_familiar/`);
    return response.data;
  },

  getMiRedFamiliar: async () => {
    const response = await api.get('/users/me/red/');
    return response.data;
  },

  updateRedFamiliar: async (id, dependientesIds) => {
    const response = await api.post(`/users/admin/users/${id}/red_familiar/`, {
      dependientes: dependientesIds,
    });
    return response.data;
  },
};