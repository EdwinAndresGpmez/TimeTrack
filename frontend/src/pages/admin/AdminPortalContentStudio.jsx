import React, { useEffect, useMemo, useState } from "react";
import {
  FaSyncAlt,
  FaSlidersH,
  FaSave,
  FaPlus,
  FaTrash,
  FaPalette,
  FaPhotoVideo,
  FaListUl,
  FaCode,
  FaEye,
} from "react-icons/fa";
import { authService } from "../../services/authService";
import { getActiveTenantSlug, setActiveTenantContext } from "../../utils/tenantContext";

const RAW_API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:8080/api";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const V1_BASE = API_BASE.endsWith("/v1") ? API_BASE : `${API_BASE}/v1`;

const ENDPOINTS = {
  homeSections: `${V1_BASE}/portal/admin/home/sections/`,
  sections: `${V1_BASE}/portal/admin/sections/`,
  theme: `${V1_BASE}/portal/admin/theme/`,
  media: `${V1_BASE}/portal/admin/media/`,
  pages: `${V1_BASE}/portal/admin/pages/`,
  bannersAdmin: `${V1_BASE}/portal/admin/banners/`,
  videosAdmin: `${V1_BASE}/portal/admin/videos/`,
};

const getToken = () => localStorage.getItem("access") || "";

async function apiRequest(url, { method = "GET", json, formData, headers = {} } = {}) {
  const token = getToken();
  const h = { ...headers };
  const tenantSlug = getActiveTenantSlug();
  if (token) h.Authorization = `Bearer ${token}`;
  if (tenantSlug) h["X-Tenant-Slug-Override"] = tenantSlug;

  let body;
  if (formData) {
    body = formData;
  } else if (json !== undefined) {
    h["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  const res = await fetch(url, { method, headers: h, body });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const msg =
      (data && data.detail) ||
      (typeof data === "string" && data) ||
      `Error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

const Pill = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
    {children}
  </span>
);

const safeJsonParse = (txt) => {
  try {
    return { ok: true, value: JSON.parse(txt) };
  } catch (e) {
    return { ok: false, error: e?.message || "JSON inválido" };
  }
};

const jsonPretty = (obj) => {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return "{}";
  }
};

const clampInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// ----------------------
// Tiny Preview Helpers
// ----------------------
const PreviewHero = ({ data, bannersById }) => {
  const slides = Array.isArray(data?.slides) ? data.slides : [];
  const first = slides[0] || null;
  const bid = first?.banner_id;
  const banner = bid ? bannersById[Number(bid)] : null;
  const img = banner?.imagen_desktop_url || banner?.imagen_movil_url || "";

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-700">Vista previa: HERO</div>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[140px_1fr]">
        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
          {img ? <img src={img} alt="hero" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">Sin imagen</div>}
        </div>
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-slate-500">{data?.subtitle || "Centro médico de salud"}</p>
          <p className="mt-2 text-lg font-extrabold text-slate-900 leading-tight">
            {data?.title || banner?.titulo || "Título"}
          </p>
          <p className="mt-2 text-sm text-slate-600 line-clamp-3">
            {data?.description || banner?.descripcion || "Descripción"}
          </p>
        </div>
      </div>
    </div>
  );
};

const PreviewFeatures = ({ data }) => {
  const items = Array.isArray(data?.items) ? data.items : [];
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-700">Vista previa: CARACTERÍSTICAS</div>
      <div className="grid grid-cols-1 gap-3 p-4">
        {(items.length ? items : [{ title: "Item", text: "..." }]).slice(0, 2).map((it, i) => (
          <div key={i} className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-extrabold text-slate-900">{it?.title || "(sin título)"}</p>
            <p className="mt-1 text-xs text-slate-600">{it?.text || ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const PreviewServices = ({ data, assetsById }) => {
  const items = Array.isArray(data?.items) ? data.items : [];
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-700">Vista previa: SERVICIOS</div>
      <div className="grid grid-cols-1 gap-3 p-4">
        {(items.length ? items : [{ title: "Servicio", text: "..." }]).slice(0, 4).map((it, i) => {
          const aid = it?.image_asset_id;
          const asset = aid ? assetsById[Number(aid)] : null;
          const img = asset?.file_url || "";
          return (
            <div key={i} className="flex gap-3 rounded-xl border border-slate-200 p-3">
              <div className="h-12 w-16 rounded bg-slate-100 overflow-hidden">
                {img ? <img src={img} alt="svc" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400">Sin img</div>}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900 truncate">{it?.title || "(sin título)"}</p>
                <p className="text-xs text-slate-600 truncate">{it?.text || ""}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ----------------------
// Visual Editors
// ----------------------

const Field = ({ label, children, hint }) => (
  <div>
    <div className="flex items-end justify-between">
      <label className="text-xs font-bold text-slate-600">{label}</label>
      {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
    </div>
    <div className="mt-1">{children}</div>
  </div>
);

const DEFAULT_THEME_PREVIEW = {
  company_name: "Mi Empresa",
  primary_color: "#2f7ecb",
  secondary_color: "#0f172a",
  accent_color: "#34d399",
  background_color: "#ffffff",
  surface_color: "#efefef",
  text_color: "#0f172a",
  border_radius: 12,
};

const PreviewSimpleSection = ({ type, data }) => {
  const map = {
    how_we_work: "CÃ³mo trabajamos",
    three_cols: "InformaciÃ³n destacada",
    values: "Nuestros valores",
    team: "Nuestro equipo",
    testimonials: "Testimonios",
    videos: "GalerÃ­a de videos",
    contact: "Contacto",
    custom: "SecciÃ³n personalizada",
  };
  const title = data?.title || map[type] || type;
  const subtitle = data?.subtitle || "Contenido configurable desde el CMS.";
  const count =
    (Array.isArray(data?.items) && data.items.length) ||
    (Array.isArray(data?.members) && data.members.length) ||
    (Array.isArray(data?.columns) && data.columns.length) ||
    0;

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-700">
        Vista previa: {String(type || "").toUpperCase()}
      </div>
      <div className="p-4">
        <p className="text-lg font-black text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        <div className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          Elementos detectados: {count}
        </div>
      </div>
    </div>
  );
};

const HEX_COLOR_6 = /^#([0-9a-f]{6})$/i;
const HEX_COLOR_3 = /^#([0-9a-f]{3})$/i;

const toColorValue = (value, fallback) => {
  const txt = String(value || "").trim();
  if (HEX_COLOR_6.test(txt)) return txt;
  if (HEX_COLOR_3.test(txt)) {
    const s = txt.slice(1);
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  }
  return fallback;
};

const ColorField = ({ label, value, onChange, fallback, description }) => {
  const safe = toColorValue(value, fallback);
  const isValid = HEX_COLOR_6.test(String(value || "").trim()) || HEX_COLOR_3.test(String(value || "").trim());

  return (
    <Field label={label} hint="HEX o selector">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
        />
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${isValid || !value ? "border-slate-200" : "border-amber-300"}`}
          placeholder={fallback}
        />
        <span className="h-8 w-8 rounded-md border border-slate-200" style={{ backgroundColor: safe }} />
      </div>
      {description ? <p className="mt-1 text-[11px] text-slate-500">{description}</p> : null}
    </Field>
  );
};

const ThemePreviewCard = ({ theme }) => {
  const t = {
    ...DEFAULT_THEME_PREVIEW,
    ...(theme || {}),
  };

  const radius = Number.isFinite(Number(t.border_radius)) ? Number(t.border_radius) : 12;

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-700">Vista previa del tema (sin guardar)</div>
      <div
        className="p-4"
        style={{
          backgroundColor: toColorValue(t.background_color, DEFAULT_THEME_PREVIEW.background_color),
          color: toColorValue(t.text_color, DEFAULT_THEME_PREVIEW.text_color),
        }}
      >
        <div className="rounded-xl border p-3" style={{ borderColor: "rgba(15,23,42,.12)", borderRadius: radius }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ejemplo de encabezado / menu</p>
          <div
            className="mt-2 rounded-lg px-4 py-3"
            style={{
              backgroundColor: toColorValue(t.secondary_color, DEFAULT_THEME_PREVIEW.secondary_color),
              color: "#ffffff",
              borderRadius: Math.max(8, radius - 4),
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold">{t.company_name || "Mi Empresa"}</p>
              <div className="hidden items-center gap-3 text-[11px] font-semibold text-white/85 sm:flex">
                <span>Inicio</span>
                <span>Servicios</span>
                <span>PQRS</span>
              </div>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-[11px] font-extrabold"
                style={{
                  backgroundColor: toColorValue(t.accent_color, DEFAULT_THEME_PREVIEW.accent_color),
                  color: toColorValue(t.background_color, DEFAULT_THEME_PREVIEW.background_color),
                }}
              >
                Botón (acento)
              </button>
            </div>
          </div>
        </div>

        <div
          className="mt-3 rounded-xl border p-4"
          style={{
            backgroundColor: toColorValue(t.surface_color, DEFAULT_THEME_PREVIEW.surface_color),
            borderRadius: radius,
            borderColor: "rgba(15, 23, 42, 0.12)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ejemplo de tarjeta</p>
          <h3 className="mt-2 text-lg font-black" style={{ color: toColorValue(t.primary_color, DEFAULT_THEME_PREVIEW.primary_color) }}>
            Título (primario)
          </h3>
          <p className="mt-1 text-sm" style={{ color: toColorValue(t.text_color, DEFAULT_THEME_PREVIEW.text_color) }}>
            Texto principal del portal (color de texto).
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
          <div className="rounded-lg border p-2" style={{ borderColor: "rgba(15,23,42,.12)" }}><b>Primario:</b> botones y títulos</div>
          <div className="rounded-lg border p-2" style={{ borderColor: "rgba(15,23,42,.12)" }}><b>Secundario:</b> menú y bandas oscuras</div>
          <div className="rounded-lg border p-2" style={{ borderColor: "rgba(15,23,42,.12)" }}><b>Acento:</b> resaltados y CTA</div>
          <div className="rounded-lg border p-2" style={{ borderColor: "rgba(15,23,42,.12)" }}><b>Fondo/Superficie:</b> página y tarjetas</div>
        </div>
      </div>
    </div>
  );
};

const HeroEditor = ({ value, onChange, banners }) => {
  const v = value || {};
  const slides = Array.isArray(v.slides) ? v.slides : [];

  const update = (patch) => onChange({ ...v, ...patch });

  const updateSlide = (idx, patch) => {
    const next = slides.map((s, i) => (i === idx ? { ...(s || {}), ...patch } : s));
    update({ slides: next });
  };

  const addSlide = () => update({ slides: [...slides, { banner_id: banners?.[0]?.id || "" }] });
  const removeSlide = (idx) => update({ slides: slides.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <Field label="Subtítulo">
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={v.subtitle || ""}
          onChange={(e) => update({ subtitle: e.target.value })}
          placeholder="Centro médico de salud"
        />
      </Field>

      <Field label="Título">
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={v.title || ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="De la máxima calidad"
        />
      </Field>

      <Field label="Descripción">
        <textarea
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={v.description || ""}
          onChange={(e) => update({ description: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Texto botón">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={v.button_text || ""}
            onChange={(e) => update({ button_text: e.target.value })}
            placeholder="CONTÁCTENOS"
          />
        </Field>
        <Field label="Link botón" hint="#contacto o URL">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={v.button_link || ""}
            onChange={(e) => update({ button_link: e.target.value })}
            placeholder="#contacto"
          />
        </Field>
      </div>

      <Field label="Autoplay (ms)">
        <input
          type="number"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={clampInt(v.autoplay_ms, 6000)}
          onChange={(e) => update({ autoplay_ms: Number(e.target.value) })}
        />
      </Field>

      <div className="rounded-xl border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-900">Slides</p>
          <button
            type="button"
            onClick={addSlide}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white"
          >
            + Agregar
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {slides.map((s, idx) => (
            <div key={idx} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600">Slide #{idx + 1}</p>
                <button
                  type="button"
                  onClick={() => removeSlide(idx)}
                  className="text-xs font-extrabold text-red-600"
                >
                  Quitar
                </button>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Banner">
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={s?.banner_id || ""}
                    onChange={(e) => updateSlide(idx, { banner_id: e.target.value })}
                  >
                    <option value="">-- Selecciona --</option>
                    {banners.map((b) => (
                      <option key={b.id} value={b.id}>
                        #{b.id} — {b.titulo || "(sin título)"}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Link (opcional)">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={s?.link || ""}
                    onChange={(e) => updateSlide(idx, { link: e.target.value })}
                    placeholder="https://... o #seccion"
                  />
                </Field>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-3">
                <Field label="Título override (opcional)">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={s?.title || ""}
                    onChange={(e) => updateSlide(idx, { title: e.target.value })}
                  />
                </Field>
                <Field label="Descripción override (opcional)">
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={s?.description || ""}
                    onChange={(e) => updateSlide(idx, { description: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}

          {slides.length === 0 && (
            <p className="text-xs text-slate-500">No hay slides. Agrega al menos 1.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const FeaturesEditor = ({ value, onChange }) => {
  const v = value || {};
  const items = Array.isArray(v.items) ? v.items : [{}, {}];
  const update = (next) => onChange({ ...v, ...next });
  const updateItem = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...(it || {}), ...patch } : it));
    update({ items: next });
  };

  return (
    <div className="space-y-4">
      {[0, 1].map((idx) => (
        <div key={idx} className="rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-extrabold text-slate-900">Bloque #{idx + 1}</p>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <Field label="Título">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={items[idx]?.title || ""}
                onChange={(e) => updateItem(idx, { title: e.target.value })}
              />
            </Field>
            <Field label="Texto">
              <textarea
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={items[idx]?.text || ""}
                onChange={(e) => updateItem(idx, { text: e.target.value })}
              />
            </Field>
            <Field label="Icon (medical/programs)">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={items[idx]?.icon || ""}
                onChange={(e) => updateItem(idx, { icon: e.target.value })}
                placeholder="medical"
              />
            </Field>
          </div>
        </div>
      ))}
    </div>
  );
};

const ServicesEditor = ({ value, onChange, mediaImages }) => {
  const v = value || {};
  const items = Array.isArray(v.items) ? v.items : [];
  const update = (patch) => onChange({ ...v, ...patch });

  const updateItem = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...(it || {}), ...patch } : it));
    update({ items: next });
  };

  const addItem = () => update({ items: [...items, { title: "", text: "", link: "/servicios", image_asset_id: null }] });
  const removeItem = (idx) => update({ items: items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <Field label="Título sección">
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={v.title || ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Servicios médicos"
        />
      </Field>

      <Field label="Subtítulo">
        <textarea
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={v.subtitle || ""}
          onChange={(e) => update({ subtitle: e.target.value })}
        />
      </Field>

      <div className="rounded-xl border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-900">Items</p>
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white"
          >
            + Agregar
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600">Item #{idx + 1}</p>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-xs font-extrabold text-red-600"
                >
                  Quitar
                </button>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-3">
                <Field label="Título">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={it?.title || ""}
                    onChange={(e) => updateItem(idx, { title: e.target.value })}
                  />
                </Field>
                <Field label="Texto">
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={it?.text || ""}
                    onChange={(e) => updateItem(idx, { text: e.target.value })}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Link">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={it?.link || ""}
                      onChange={(e) => updateItem(idx, { link: e.target.value })}
                      placeholder="/servicios"
                    />
                  </Field>
                  <Field label="Imagen (recurso)" hint="ID en multimedia">
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={it?.image_asset_id || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateItem(idx, { image_asset_id: v ? Number(v) : null });
                      }}
                    >
                      <option value="">-- Sin imagen --</option>
                      {mediaImages.map((m) => (
                        <option key={m.id} value={m.id}>
                          #{m.id} — {m.title || m.file_url || "recurso"}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && <p className="text-xs text-slate-500">No hay items. Agrega al menos 1.</p>}
        </div>
      </div>
    </div>
  );
};

// ----------------------
// Main Component
// ----------------------

const AdminPortalContentStudio = () => {
  const [tab, setTab] = useState("sections"); // sections | theme | media
  const [subTab, setSubTab] = useState("visual"); // visual | json | preview
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTenantSlug, setActiveTenantSlug] = useState(() => getActiveTenantSlug());

  const [homePageId, setHomePageId] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  const [theme, setTheme] = useState(null);
  const [themeDraft, setThemeDraft] = useState(null);
  const [themeLogoFile, setThemeLogoFile] = useState(null);
  const patchThemeDraft = (patch) => setThemeDraft((prev) => ({ ...(prev || {}), ...patch }));

  const [mediaList, setMediaList] = useState([]);
  const [mediaUpload, setMediaUpload] = useState({ type: "image", title: "", alt_text: "", tags: "", file: null });

  const [banners, setBanners] = useState([]);
  const [videos, setVideos] = useState([]);
  const portalUrl = activeTenantSlug ? `${window.location.origin}/t/${activeTenantSlug}` : null;
  const portalDomain = activeTenantSlug ? `${activeTenantSlug}.app.idefnova.com` : null;

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedSectionId) || null,
    [sections, selectedSectionId]
  );

  // Section base fields
  const [secTitle, setSecTitle] = useState("");
  const [secType, setSecType] = useState("hero");
  const [secOrder, setSecOrder] = useState(10);
  const [secActive, setSecActive] = useState(true);

  // Data as object + JSON mirror
  const [secDataObj, setSecDataObj] = useState({});
  const [secDataText, setSecDataText] = useState("{}");
  const [secDataError, setSecDataError] = useState("");

  const assetsById = useMemo(() => {
    const map = {};
    for (const a of mediaList || []) map[a.id] = a;
    return map;
  }, [mediaList]);

  const mediaImages = useMemo(() => (mediaList || []).filter((m) => m.type === "image"), [mediaList]);

  const bannersById = useMemo(() => {
    const map = {};
    for (const b of banners || []) map[b.id] = b;
    return map;
  }, [banners]);

  const refreshAll = async () => {
    try {
      setLoading(true);
      setError("");

      // ensure home page exists
      const pages = await apiRequest(ENDPOINTS.pages);
      let home = Array.isArray(pages) ? pages.find((p) => p.slug === "home") : null;
      if (!home) {
        home = await apiRequest(ENDPOINTS.pages, { method: "POST", json: { slug: "home", title: "Home" } });
      }
      setHomePageId(home?.id ?? null);

      const [sec, th, media, ban, vid] = await Promise.all([
        apiRequest(ENDPOINTS.homeSections),
        apiRequest(ENDPOINTS.theme),
        apiRequest(ENDPOINTS.media),
        apiRequest(ENDPOINTS.bannersAdmin),
        apiRequest(ENDPOINTS.videosAdmin),
      ]);

      const arr = Array.isArray(sec) ? sec : [];
      setSections(arr);
      setTheme(th);
      setThemeDraft(th);
      setMediaList(Array.isArray(media) ? media : []);
      setBanners(Array.isArray(ban) ? ban : []);
      setVideos(Array.isArray(vid) ? vid : []);

      if (arr.length && selectedSectionId == null) setSelectedSectionId(arr[0].id);
    } catch (e) {
      setError(e?.message || "Error cargando Content Studio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setError("No hay token en localStorage.access. Inicia sesión primero.");
      return;
    }
    refreshAll();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const ensureTenantContext = async () => {
      if (activeTenantSlug) return;
      try {
        const memberships = await authService.getMisTenants();
        const list = Array.isArray(memberships) ? memberships : memberships?.results || [];
        const preferred = list.find((x) => x.is_default) || list[0];
        if (preferred?.tenant_slug) {
          setActiveTenantContext({
            tenantId: preferred.tenant_id,
            tenantSlug: preferred.tenant_slug,
          });
          setActiveTenantSlug(preferred.tenant_slug);
        }
      } catch (_err) {
        // no-op
      }
    };
    ensureTenantContext();
  }, [activeTenantSlug]);

  useEffect(() => {
    if (!selectedSection) return;

    setSecTitle(selectedSection.title || "");
    setSecType(selectedSection.type || "hero");
    setSecOrder(Number(selectedSection.order ?? 0));
    setSecActive(Boolean(selectedSection.is_active));

    const obj = selectedSection.data || {};
    setSecDataObj(obj);
    setSecDataText(jsonPretty(obj));
    setSecDataError("");

    setSubTab("visual");
  }, [selectedSectionId]);

  // Keep JSON mirror in sync when visual changes
  useEffect(() => {
    setSecDataText(jsonPretty(secDataObj));
    // eslint-disable-next-line
  }, [secDataObj]);

  const saveSection = async () => {
    if (!selectedSection) return;

    // If user is in JSON tab, parse JSON and override obj
    if (subTab === "json") {
      const parsed = safeJsonParse(secDataText);
      if (!parsed.ok) {
        setSecDataError(parsed.error);
        return;
      }
      setSecDataError("");
      setSecDataObj(parsed.value);
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        title: secTitle,
        type: secType,
        order: Number(secOrder),
        is_active: Boolean(secActive),
        data: secDataObj,
      };

      const updated = await apiRequest(`${ENDPOINTS.sections}${selectedSection.id}/`, {
        method: "PATCH",
        json: payload,
      });

      const sec = await apiRequest(ENDPOINTS.homeSections);
      const arr = Array.isArray(sec) ? sec : [];
      setSections(arr);
      setSelectedSectionId(updated?.id ?? selectedSection.id);
    } catch (e) {
      setError(e?.message || "Error guardando sección");
    } finally {
      setLoading(false);
    }
  };

  const createSection = async () => {
    if (!homePageId) {
      setError("No pude obtener el Page ID de 'home'.");
      return;
    }

    // parse JSON if user is in json tab
    let dataToSave = secDataObj;
    if (subTab === "json") {
      const parsed = safeJsonParse(secDataText);
      if (!parsed.ok) {
        setSecDataError(parsed.error);
        return;
      }
      setSecDataError("");
      dataToSave = parsed.value;
      setSecDataObj(parsed.value);
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        page: homePageId,
        title: secTitle || "Nueva sección",
        type: secType || "custom",
        order: Number(secOrder || 0),
        is_active: Boolean(secActive),
        data: dataToSave,
      };

      const created = await apiRequest(ENDPOINTS.sections, { method: "POST", json: payload });
      const sec = await apiRequest(ENDPOINTS.homeSections);
      const arr = Array.isArray(sec) ? sec : [];
      setSections(arr);
      setSelectedSectionId(created?.id ?? null);
    } catch (e) {
      setError(e?.message || "Error creando sección");
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async () => {
    if (!selectedSection) return;
    if (!confirm("¿Eliminar esta sección? Esta acción no se puede deshacer.")) return;

    try {
      setLoading(true);
      setError("");

      await apiRequest(`${ENDPOINTS.sections}${selectedSection.id}/`, { method: "DELETE" });

      const sec = await apiRequest(ENDPOINTS.homeSections);
      const arr = Array.isArray(sec) ? sec : [];
      setSections(arr);
      setSelectedSectionId(arr.length ? arr[0].id : null);
    } catch (e) {
      setError(e?.message || "Error eliminando sección");
    } finally {
      setLoading(false);
    }
  };

  const saveTheme = async () => {
    try {
      setLoading(true);
      setError("");

      if (!themeDraft) return;

      if (themeLogoFile) {
        const fd = new FormData();
        fd.append("company_name", themeDraft.company_name || "");
        fd.append("primary_color", themeDraft.primary_color || "#2f7ecb");
        fd.append("secondary_color", themeDraft.secondary_color || "#0f172a");
        fd.append("accent_color", themeDraft.accent_color || "#34d399");
        fd.append("background_color", themeDraft.background_color || "#ffffff");
        fd.append("surface_color", themeDraft.surface_color || "#efefef");
        fd.append("text_color", themeDraft.text_color || "#0f172a");
        fd.append("border_radius", String(themeDraft.border_radius ?? 12));
        fd.append("logo", themeLogoFile);

        const updated = await apiRequest(ENDPOINTS.theme, { method: "PATCH", formData: fd });
        setTheme(updated);
        setThemeDraft(updated);
        setThemeLogoFile(null);
      } else {
        const payload = {
          company_name: themeDraft.company_name,
          primary_color: themeDraft.primary_color,
          secondary_color: themeDraft.secondary_color,
          accent_color: themeDraft.accent_color,
          background_color: themeDraft.background_color,
          surface_color: themeDraft.surface_color,
          text_color: themeDraft.text_color,
          border_radius: themeDraft.border_radius,
        };

        const updated = await apiRequest(ENDPOINTS.theme, { method: "PATCH", json: payload });
        setTheme(updated);
        setThemeDraft(updated);
      }
    } catch (e) {
      setError(e?.message || "Error guardando theme");
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async () => {
    if (!mediaUpload.file) {
      setError("Selecciona un archivo para subir.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const fd = new FormData();
      fd.append("type", mediaUpload.type || "image");
      fd.append("title", mediaUpload.title || "");
      fd.append("alt_text", mediaUpload.alt_text || "");

      const tagsTxt = (mediaUpload.tags || "").trim();
      if (tagsTxt) {
        let tags = [];
        if (tagsTxt.startsWith("[")) {
          const parsed = safeJsonParse(tagsTxt);
          tags = parsed.ok ? parsed.value : [];
        } else {
          tags = tagsTxt
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }
        fd.append("tags", JSON.stringify(tags));
      } else {
        fd.append("tags", JSON.stringify([]));
      }

      fd.append("file", mediaUpload.file);

      await apiRequest(ENDPOINTS.media, { method: "POST", formData: fd });

      const media = await apiRequest(ENDPOINTS.media);
      setMediaList(Array.isArray(media) ? media : []);
      setMediaUpload({ type: "image", title: "", alt_text: "", tags: "", file: null });
    } catch (e) {
      setError(e?.message || "Error subiendo media");
    } finally {
      setLoading(false);
    }
  };

  const sectionBadge = (t) => {
    const type = String(t || "").toLowerCase();
    return <Pill>{type || "section"}</Pill>;
  };

  const renderPreview = () => {
    if (!selectedSection) return null;
    const t = selectedSection.type;
    const data = secDataObj;

    if (t === "hero") return <PreviewHero data={data} bannersById={bannersById} />;
    if (t === "features") return <PreviewFeatures data={data} />;
    if (t === "services") return <PreviewServices data={data} assetsById={assetsById} />;
    if (["how_we_work", "three_cols", "values", "team", "testimonials", "videos", "contact", "custom"].includes(t)) {
      return <PreviewSimpleSection type={t} data={data} />;
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 text-xs font-extrabold text-slate-700">Vista previa</div>
        <div className="p-4 text-sm text-slate-600">
          No hay vista previa visual para <b>{t}</b> todavía. Usa la pestaña JSON.
        </div>
      </div>
    );
  };

  const renderVisualEditor = () => {
    if (!selectedSection) return null;
    const t = secType;

    if (t === "hero") return <HeroEditor value={secDataObj} onChange={setSecDataObj} banners={banners} />;
    if (t === "features") return <FeaturesEditor value={secDataObj} onChange={setSecDataObj} />;
    if (t === "services") return <ServicesEditor value={secDataObj} onChange={setSecDataObj} mediaImages={mediaImages} />;

    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        Editor visual aún no implementado para <b>{t}</b>. Usa la pestaña <b>JSON</b>.
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-3 text-white shadow-lg">
              <FaSlidersH size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Portal Content Studio</h1>
              <p className="text-sm text-slate-500">Editor visual + vista previa (sin escribir JSON a mano).</p>
            </div>
          </div>

          <button
            onClick={refreshAll}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <FaSyncAlt />
            {loading ? "Actualizando..." : "Refrescar"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-extrabold">Portal del tenant actual</p>
          {portalUrl ? (
            <>
              <p className="mt-1">
                URL app:{" "}
                <a className="font-bold underline" href={portalUrl} target="_blank" rel="noreferrer">
                  {portalUrl}
                </a>
              </p>
              <p className="mt-1 text-xs text-blue-800">
                Dominio esperado: <span className="font-semibold">{portalDomain}</span>
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs">
              No hay tenant activo detectado. Cambia tenant en el sidebar para editar el portal correcto.
            </p>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_520px]">
          {/* LEFT: Sections list + preview */}
          <div className="order-2 space-y-6 lg:order-1">
            <div className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black tracking-widest text-slate-400 uppercase">Secciones Home</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setTab("sections")}
                    className={`rounded-lg px-3 py-2 text-xs font-extrabold ${tab === "sections" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    <FaListUl className="inline-block mr-2" />
                    Secciones
                  </button>
                  <button
                    onClick={() => setTab("theme")}
                    className={`rounded-lg px-3 py-2 text-xs font-extrabold ${tab === "theme" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    <FaPalette className="inline-block mr-2" />
                    Tema
                  </button>
                  <button
                    onClick={() => setTab("media")}
                    className={`rounded-lg px-3 py-2 text-xs font-extrabold ${tab === "media" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    <FaPhotoVideo className="inline-block mr-2" />
                    Multimedia
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSectionId(s.id);
                      setTab("sections");
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      s.id === selectedSectionId
                        ? "border-indigo-400 ring-2 ring-indigo-200"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate">#{s.order} — {s.title || "(sin título)"}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {sectionBadge(s.type)}
                          <Pill>{s.is_active ? "activo" : "inactivo"}</Pill>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">ID {s.id}</div>
                    </div>
                  </button>
                ))}
                {sections.length === 0 && <p className="text-sm text-slate-500">No hay secciones para home.</p>}
              </div>
            </div>

            {tab === "sections" && renderPreview()}
          </div>

          {/* RIGHT: Editor */}
          <div className="order-1 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:order-2">
            {tab === "sections" && (
              <>
                <h2 className="text-sm font-black tracking-widest text-slate-400 uppercase">Editor de sección</h2>

                {!selectedSection ? (
                  <p className="mt-5 text-sm text-slate-600">Selecciona una sección de la lista para editarla.</p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {/* Base fields */}
                    <Field label="Título">
                      <input
                        value={secTitle}
                        onChange={(e) => setSecTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </Field>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Tipo">
                        <select
                          value={secType}
                          onChange={(e) => setSecType(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="hero">hero</option>
                          <option value="features">features</option>
                          <option value="services">services</option>
                          <option value="how_we_work">how_we_work</option>
                          <option value="three_cols">three_cols</option>
                          <option value="values">values</option>
                          <option value="team">team</option>
                          <option value="testimonials">testimonials</option>
                          <option value="videos">videos</option>
                          <option value="contact">contact</option>
                          <option value="custom">custom</option>
                        
                        </select>
                      </Field>
                      <Field label="Orden">
                        <input
                          type="number"
                          value={secOrder}
                          onChange={(e) => setSecOrder(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </Field>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={secActive} onChange={(e) => setSecActive(e.target.checked)} />
                      <span className="font-semibold text-slate-700">Activa</span>
                    </label>

                    {/* Subtabs */}
                    <div className="mt-2 inline-flex w-full rounded-xl bg-slate-100 p-1">
                      <button
                        onClick={() => setSubTab("visual")}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-extrabold transition ${subTab === "visual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        <FaEye className="inline-block mr-2" /> Visual
                      </button>
                      <button
                        onClick={() => setSubTab("json")}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-extrabold transition ${subTab === "json" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        <FaCode className="inline-block mr-2" /> JSON
                      </button>
                    </div>

                    {subTab === "visual" ? (
                      renderVisualEditor()
                    ) : (
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-600">Datos (JSON)</label>
                          <span className="text-[11px] text-slate-400">Modo avanzado</span>
                        </div>
                        <textarea
                          value={secDataText}
                          onChange={(e) => setSecDataText(e.target.value)}
                          rows={14}
                          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                        />
                        {secDataError && <p className="mt-2 text-xs text-red-600">{secDataError}</p>}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={saveSection}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white hover:opacity-90"
                        disabled={loading}
                      >
                        <FaSave /> Guardar
                      </button>

                      <button
                        onClick={createSection}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:opacity-90"
                        disabled={loading}
                        title="Crea una nueva sección con los valores actuales del editor"
                      >
                        <FaPlus /> Crear nueva
                      </button>

                      <button
                        onClick={deleteSection}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white hover:opacity-90"
                        disabled={loading}
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                      <p className="font-bold text-slate-700">Consejos</p>
                      <ul className="mt-2 list-disc ml-5 space-y-1">
                        <li>En <b>Hero</b> selecciona banners desde la lista (no escribas IDs).</li>
                        <li>En <b>Servicios</b> puedes elegir imágenes desde Multimedia.</li>
                        <li>Si necesitas algo especial, usa la pestaña <b>JSON</b> (modo avanzado).</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === "theme" && (
              <>
                <h2 className="text-sm font-black tracking-widest text-slate-400 uppercase">Tema / Marca visual</h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    Ajusta colores con la paleta y revisa la vista previa. Cada etiqueta indica exactamente donde se usa ese color en el portal.
                  </div>

                  <Field label="Nombre de la empresa">
                    <input
                      value={themeDraft?.company_name || ""}
                      onChange={(e) => patchThemeDraft({ company_name: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ColorField
                      label="Primario"
                      value={themeDraft?.primary_color || ""}
                      onChange={(v) => patchThemeDraft({ primary_color: v })}
                      fallback={DEFAULT_THEME_PREVIEW.primary_color}
                      description="Titulos principales y botones primarios."
                    />
                    <ColorField
                      label="Secundario"
                      value={themeDraft?.secondary_color || ""}
                      onChange={(v) => patchThemeDraft({ secondary_color: v })}
                      fallback={DEFAULT_THEME_PREVIEW.secondary_color}
                      description="Barra del menu superior y zonas de contraste."
                    />
                    <ColorField
                      label="Acento"
                      value={themeDraft?.accent_color || ""}
                      onChange={(v) => patchThemeDraft({ accent_color: v })}
                      fallback={DEFAULT_THEME_PREVIEW.accent_color}
                      description="Resaltados y llamados a la accion (CTA)."
                    />
                    <ColorField
                      label="Fondo"
                      value={themeDraft?.background_color || ""}
                      onChange={(v) => patchThemeDraft({ background_color: v })}
                      fallback={DEFAULT_THEME_PREVIEW.background_color}
                      description="Fondo base general de la pagina."
                    />
                    <ColorField
                      label="Superficie"
                      value={themeDraft?.surface_color || ""}
                      onChange={(v) => patchThemeDraft({ surface_color: v })}
                      fallback={DEFAULT_THEME_PREVIEW.surface_color}
                      description="Tarjetas, bloques y contenedores."
                    />
                    <ColorField
                      label="Texto"
                      value={themeDraft?.text_color || ""}
                      onChange={(v) => patchThemeDraft({ text_color: v })}
                      fallback={DEFAULT_THEME_PREVIEW.text_color}
                      description="Texto principal y contenido legible."
                    />
                  </div>

                  <ThemePreviewCard theme={themeDraft} />

                  <Field label="Redondeo de bordes">
                    <input
                      type="number"
                      value={themeDraft?.border_radius ?? 12}
                      onChange={(e) => patchThemeDraft({ border_radius: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </Field>

                  <Field label="Logo (opcional)">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setThemeLogoFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm"
                    />
                    {theme?.logo_url && (
                      <div className="mt-3 flex items-center gap-3">
                        <img src={theme.logo_url} alt="logo" className="h-10 w-10 rounded bg-slate-100 object-cover" />
                        <span className="text-xs text-slate-500 truncate">{theme.logo_url}</span>
                      </div>
                    )}
                  </Field>

                  <button
                    onClick={saveTheme}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white hover:opacity-90"
                    disabled={loading}
                  >
                    <FaSave /> Guardar tema
                  </button>
                </div>
              </>
            )}

            {tab === "media" && (
              <>
                <h2 className="text-sm font-black tracking-widest text-slate-400 uppercase">Biblioteca multimedia</h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-extrabold text-slate-900">Subir nuevo recurso</p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Tipo">
                        <select
                          value={mediaUpload.type}
                          onChange={(e) => setMediaUpload({ ...mediaUpload, type: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="image">image</option>
                          <option value="video">video</option>
                          <option value="pdf">pdf</option>
                        
                        </select>
                      </Field>

                      <Field label="Archivo">
                        <input
                          type="file"
                          onChange={(e) => setMediaUpload({ ...mediaUpload, file: e.target.files?.[0] || null })}
                          className="block w-full text-sm"
                        />
                      </Field>
                    </div>

                    <Field label="Título">
                      <input
                        value={mediaUpload.title}
                        onChange={(e) => setMediaUpload({ ...mediaUpload, title: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </Field>

                    <Field label="Alt text">
                      <input
                        value={mediaUpload.alt_text}
                        onChange={(e) => setMediaUpload({ ...mediaUpload, alt_text: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </Field>

                    <Field label="Tags" hint="separados por coma">
                      <input
                        value={mediaUpload.tags}
                        onChange={(e) => setMediaUpload({ ...mediaUpload, tags: e.target.value })}
                        placeholder='hero, servicios, team (o JSON: ["hero","servicios"])'
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </Field>

                    <button
                      onClick={uploadMedia}
                      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:opacity-90"
                      disabled={loading}
                    >
                      <FaPlus /> Subir recurso
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-extrabold text-slate-900">Recursos ({mediaList.length})</p>

                    <div className="mt-3 max-h-[420px] overflow-auto space-y-3 pr-1">
                      {mediaList.map((m) => (
                        <div key={m.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                          <div className="h-12 w-16 overflow-hidden rounded bg-slate-100 shrink-0">
                            {m.type === "image" && m.file_url ? (
                              <img src={m.file_url} alt={m.title || "asset"} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">{m.type}</div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-900 truncate">#{m.id} — {m.title || "(sin título)"}</p>
                            <p className="text-[11px] text-slate-500 truncate">{m.file_url || "sin url"}</p>
                            <p className="text-[11px] text-slate-500">tags: {Array.isArray(m.tags) ? m.tags.join(", ") : ""}</p>
                          </div>
                        </div>
                      ))}

                      {mediaList.length === 0 && <p className="text-sm text-slate-500">No hay recursos todavía.</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          API Base: <span className="font-semibold">{V1_BASE}</span>
        </p>
      </div>
    </div>
  );
};

export default AdminPortalContentStudio;

