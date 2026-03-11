import api from '../api/axiosConfig';
import { clearActiveTenantContext, setActiveTenantContext } from '../utils/tenantContext';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientNetworkError = (error) =>
  error?.code === 'ERR_NETWORK' ||
  String(error?.message || '').toLowerCase().includes('network error') ||
  String(error?.message || '').toLowerCase().includes('connection reset');

const getWithRetry = async (url, config = {}, retries = 2, delayMs = 300) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await api.get(url, config);
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt === retries) {
        throw error;
      }
      await sleep(delayMs * (attempt + 1));
    }
  }
  throw lastError;
};

export const authService = {
  register: async (userData) => {
    const payload = {
      nombre: userData.nombre,
      apellidos: userData.apellidos,
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
      if (!error.response) {
        throw { detail: 'Error de conexión con el servidor (CORS/red).' };
      }
      throw error.response.data;
    }
  },

  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login/', {
        documento: credentials.documento,
        password: credentials.password,
      });

      if (response.data?.access) {
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);

        localStorage.setItem('token', response.data.access);
      }

      if (response.data?.tenant_id || response.data?.tenant_slug) {
        setActiveTenantContext({
          tenantId: response.data?.tenant_id || null,
          tenantSlug: response.data?.tenant_slug || null,
        });
      }

      return response.data;
    } catch (error) {
      console.error('Error Login:', error.response?.data || error.message);
      if (!error.response) {
        throw { detail: 'Error de conexión con el servidor (CORS/red).' };
      }
      throw error.response.data || { detail: 'Credenciales incorrectas' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    localStorage.removeItem('intencionCita');
    clearActiveTenantContext();
  },

  updateUser: async (_id, data) => {
    const response = await api.patch('/auth/me/', data);
    return response.data;
  },

  getMenu: async () => {
    const response = await getWithRetry('/auth/menu/');
    return response.data;
  },

  getMisPermisos: async () => {
    const response = await api.get('/auth/me/permisos/');
    return response.data;
  },

  getMisTenants: async () => {
    const response = await getWithRetry('/users/me/tenants/');
    return response.data;
  },

  switchTenant: async (tenantId, tenantSlug = null) => {
    const payload = { tenant_id: tenantId };
    if (tenantSlug) payload.tenant_slug = tenantSlug;
    const response = await api.post('/users/switch-tenant/', payload);
    if (response.data?.access) {
      localStorage.setItem('access', response.data.access);
      localStorage.setItem('refresh', response.data.refresh);
      localStorage.setItem('token', response.data.access);
    }
    setActiveTenantContext({
      tenantId: response.data?.tenant_id || tenantId,
      tenantSlug: response.data?.tenant_slug || null,
    });
    return response.data;
  },

  getDocumentTypes: async () => {
    const response = await api.get('/auth/document-types/');
    return response.data;
  },

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

  createGroup: async (data) => {
    const response = await api.post('/users/admin/groups/', data);
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
    const response = await getWithRetry('/users/admin/branding/');
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

  getGuideContent: async (key = null) => {
    const response = await api.get('/users/guide-content/', {
      params: key ? { key } : {},
    });
    return response.data;
  },

  getGuideContentAdmin: async () => {
    const response = await api.get('/users/admin/guide-content/');
    return response.data;
  },

  createGuideContent: async (payload) => {
    const response = await api.post('/users/admin/guide-content/', payload);
    return response.data;
  },

  updateGuideContent: async (id, payload) => {
    const response = await api.patch(`/users/admin/guide-content/${id}/`, payload);
    return response.data;
  },

  updateRedFamiliar: async (id, dependientesIds) => {
    const response = await api.post(`/users/admin/users/${id}/red_familiar/`, {
      dependientes: dependientesIds,
    });
    return response.data;
  },
};

