export function getTenantSlugFromPath(pathname) {
  const path = pathname || window.location.pathname || "";
  const match = path.match(/^\/t\/([^/]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getTenantPrefix(tenantSlug) {
  return tenantSlug ? `/t/${encodeURIComponent(tenantSlug)}` : "";
}

export function withTenantPath(tenantSlug, path) {
  const cleanPath = path?.startsWith("/") ? path : `/${path || ""}`;
  return `${getTenantPrefix(tenantSlug)}${cleanPath}`;
}

