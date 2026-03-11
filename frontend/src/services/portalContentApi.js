
const DEFAULT_BASE = "http://localhost:8007";
export const BASE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_PORTAL_MS_URL) ||
  DEFAULT_BASE;

export function absolutizeUrl(url) {
  if (!url) return "";
  if (typeof url !== "string") return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const base = BASE_URL.replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

async function request(path, options = {}) {
  const base = BASE_URL.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${p}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const msg =
      (data && data.detail) ||
      (typeof data === "string" && data) ||
      `Request failed: ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function getBanners() {
  const data = await request("/api/v1/portal/banners/");
  return Array.isArray(data)
    ? data.map((b) => ({
        ...b,
        imagen_desktop_url: absolutizeUrl(b.imagen_desktop_url),
        imagen_movil_url: absolutizeUrl(b.imagen_movil_url),
      }))
    : [];
}

export async function getVideos() {
  const data = await request("/api/v1/portal/videos/");
  return Array.isArray(data)
    ? data.map((v) => ({
        ...v,
        archivo_video_url: absolutizeUrl(v.archivo_video_url),
        portada_url: absolutizeUrl(v.portada_url),
      }))
    : [];
}

export function buildBannerFormData(payload = {}) {
  const fd = new FormData();

  if (payload.titulo != null) fd.append("titulo", payload.titulo);
  if (payload.descripcion != null) fd.append("descripcion", payload.descripcion);
  if (payload.link_accion != null) fd.append("link_accion", payload.link_accion);
  if (payload.orden != null) fd.append("orden", String(payload.orden));
  if (payload.activo != null) fd.append("activo", String(payload.activo));

  if (payload.imagen_desktop instanceof File)
    fd.append("imagen_desktop", payload.imagen_desktop);

  if (payload.imagen_movil instanceof File)
    fd.append("imagen_movil", payload.imagen_movil);

  return fd;
}

export function buildVideoFormData(payload = {}) {
  const fd = new FormData();

  if (payload.url_externa != null) fd.append("url_externa", payload.url_externa);
  if (payload.activo != null) fd.append("activo", String(payload.activo));

  if (payload.portada instanceof File) fd.append("portada", payload.portada);
  if (payload.archivo_video instanceof File)
    fd.append("archivo_video", payload.archivo_video);

  return fd;
}


