import api from '../api/axiosConfig';

const q = (tenantId) => (tenantId ? { tenant_id: tenantId } : {});

export const notificationService = {
  getChannelConfigs: async (tenantId) => {
    const response = await api.get('/notificaciones/channel-configs/', { params: q(tenantId) });
    return response.data;
  },
  createChannelConfig: async (payload, tenantId) => {
    const response = await api.post('/notificaciones/channel-configs/', payload, { params: q(tenantId) });
    return response.data;
  },
  updateChannelConfig: async (id, payload, tenantId) => {
    const response = await api.patch(`/notificaciones/channel-configs/${id}/`, payload, { params: q(tenantId) });
    return response.data;
  },
  testChannelConfig: async (id, tenantId) => {
    const response = await api.post(`/notificaciones/channel-configs/${id}/test-connection/`, {}, { params: q(tenantId) });
    return response.data;
  },
  getQrInfo: async (id, tenantId) => {
    const response = await api.get(`/notificaciones/channel-configs/${id}/qr-info/`, { params: q(tenantId) });
    return response.data;
  },
  getTemplates: async (tenantId) => {
    const response = await api.get('/notificaciones/templates/', { params: q(tenantId) });
    return response.data;
  },
  createTemplate: async (payload, tenantId) => {
    const response = await api.post('/notificaciones/templates/', payload, { params: q(tenantId) });
    return response.data;
  },
  updateTemplate: async (id, payload, tenantId) => {
    const response = await api.patch(`/notificaciones/templates/${id}/`, payload, { params: q(tenantId) });
    return response.data;
  },
  dispatchNotification: async (payload, tenantId) => {
    const response = await api.post('/notificaciones/dispatch/', payload, { params: q(tenantId) });
    return response.data;
  },
};

export default notificationService;

