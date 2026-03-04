import api from '../api/axiosConfig';

export const auditoriaService = {
  /**
   * params soportados (backend auth-ms):
   * - page
   * - search
   * - usuario_id
   * - modulo
   * - accion
   * - recurso
   * - recurso_id
   * - fecha__gte
   * - fecha__lte
   * - ordering (ej: -fecha)
   */
  getAll: async (params = {}) => {
    const response = await api.get('/users/admin/auditoria/', { params });
    return response.data;
  }
};