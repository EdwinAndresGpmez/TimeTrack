import api from '../api/axiosConfig';

export const auditoriaService = {
  getAll: async (params = {}) => {
    const response = await api.get('/users/admin/auditoria/', { params });
    return response.data;
  }
};
