const ACTIVE_TENANT_ID_KEY = 'active_tenant_id';
const ACTIVE_TENANT_SLUG_KEY = 'active_tenant_slug';

export function getActiveTenantId() {
  const raw = localStorage.getItem(ACTIVE_TENANT_ID_KEY);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getActiveTenantSlug() {
  return localStorage.getItem(ACTIVE_TENANT_SLUG_KEY) || null;
}

export function setActiveTenantContext({ tenantId, tenantSlug }) {
  if (tenantId !== undefined && tenantId !== null) {
    localStorage.setItem(ACTIVE_TENANT_ID_KEY, String(tenantId));
  }
  if (tenantSlug) {
    localStorage.setItem(ACTIVE_TENANT_SLUG_KEY, tenantSlug);
  }
}

export function clearActiveTenantContext() {
  localStorage.removeItem(ACTIVE_TENANT_ID_KEY);
  localStorage.removeItem(ACTIVE_TENANT_SLUG_KEY);
}
