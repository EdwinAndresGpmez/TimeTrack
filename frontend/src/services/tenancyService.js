import api from '../api/axiosConfig';

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

export const tenancyService = {
  selfSignup: async (payload) => {
    const response = await api.post('/tenancy/self-signup', payload);
    return response.data;
  },
  provision: async (payload) => {
    const response = await api.post('/tenancy/provision', payload);
    return response.data;
  },
  getTenants: async () => {
    const response = await getWithRetry('/tenancy/tenants/');
    return response.data;
  },
  getPlans: async () => {
    const response = await getWithRetry('/tenancy/plans/');
    return response.data;
  },
  getFeatures: async () => {
    const response = await getWithRetry('/tenancy/features/');
    return response.data;
  },
  updateFeature: async (id, payload) => {
    const response = await api.patch(`/tenancy/features/${id}/`, payload);
    return response.data;
  },
  getPlanFeatures: async (planId = null) => {
    const response = await getWithRetry('/tenancy/plan-features/', {
      params: planId ? { plan: planId } : {},
    });
    return response.data;
  },
  updatePlanFeature: async (id, payload) => {
    const response = await api.patch(`/tenancy/plan-features/${id}/`, payload);
    return response.data;
  },
  getSubscriptions: async () => {
    const response = await getWithRetry('/tenancy/subscriptions/');
    return response.data;
  },
  updateSubscription: async (id, payload) => {
    const response = await api.patch(`/tenancy/subscriptions/${id}/`, payload);
    return response.data;
  },
  getFeatureOverrides: async (tenantId) => {
    const response = await getWithRetry('/tenancy/feature-overrides/', {
      params: tenantId ? { tenant: tenantId } : {},
    });
    return response.data;
  },
  getCurrentPolicy: async () => {
    const response = await getWithRetry('/tenancy/policy/current');
    return response.data;
  },
  createFeatureOverride: async (payload) => {
    const response = await api.post('/tenancy/feature-overrides/', payload);
    return response.data;
  },
  updateFeatureOverride: async (id, payload) => {
    const response = await api.patch(`/tenancy/feature-overrides/${id}/`, payload);
    return response.data;
  },
};

