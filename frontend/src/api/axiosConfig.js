import axios from 'axios';
import { getTenantSlugFromPath } from '../utils/tenantRouting';
import { getActiveTenantSlug } from '../utils/tenantContext';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const apiBaseUrl = normalizedBaseUrl.endsWith('/v1')
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/v1`;

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access') || localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const tenantSlug = getTenantSlugFromPath() || getActiveTenantSlug();
    if (tenantSlug) {
      config.headers['X-Tenant-Slug-Override'] = tenantSlug;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const hadAuthHeader = !!error?.config?.headers?.Authorization;

    const tokenNotValid =
      data?.code === 'token_not_valid' ||
      (typeof data?.detail === 'string' && data.detail.toLowerCase().includes('token'));

    if (status === 401 && hadAuthHeader && tokenNotValid) {
      console.warn('Token inválido/expirado. Cerrando sesión...');
      localStorage.removeItem('token');
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
    }

    return Promise.reject(error);
  }
);

export default api;

