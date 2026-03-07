import React, { useMemo } from "react";

const ServiciosMedicos = ({ data }) => {
  const title = data?.title || "Servicios médicos";
  const subtitle =
    data?.subtitle ||
    "Sample text. Click to select the text box. Click again or double click to start editing the text.";

  const items = useMemo(() => {
    const arr = data?.items;
    if (Array.isArray(arr) && arr.length) return arr;

    // fallback si no viene desde CMS
    return [
      {
        title: "Hospitalistas",
        text: "Texto editable.",
        link: "/servicios",
        image_asset_id: null,
        image_asset: null,
      },
      {
        title: "Pediatría",
        text: "Texto editable.",
        link: "/servicios",
        image_asset_id: null,
        image_asset: null,
      },
      {
        title: "Cuidado crítico",
        text: "Texto editable.",
        link: "/servicios",
        image_asset_id: null,
        image_asset: null,
      },
      {
        title: "Laboratorio",
        text: "Texto editable.",
        link: "/servicios",
        image_asset_id: null,
        image_asset: null,
      },
    ];
  }, [data]);

  return (
    <section className="portal-section">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="portal-fade-up text-center">
          <h2
            className="text-4xl lg:text-5xl font-extrabold"
            style={{ color: "var(--portal-primary)" }}
          >
            {title}
          </h2>
          <p className="portal-muted mt-4 text-sm">{subtitle}</p>
        </div>

        <div className="portal-stagger mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((it, idx) => {
            const imgUrl = it?.image_asset?.file_url || "";
            const link = it?.link || "#";

            return (
              <a
                key={idx}
                href={link}
                className="portal-card portal-card-hover portal-reveal group overflow-hidden rounded-xl transition"
                style={{ borderRadius: "var(--portal-radius)" }}
              >
                <div className="grid grid-cols-[140px_1fr] gap-5 p-6">
                  {/* Imagen */}
                  <div className="h-24 w-32 overflow-hidden rounded-lg" style={{ backgroundColor: "var(--portal-surface)" }}>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={it?.title || "servicio"}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="portal-soft flex h-full w-full items-center justify-center text-xs">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  {/* Texto */}
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold truncate" style={{ color: "var(--portal-text)" }}>
                      {it?.title || "Servicio"}
                    </h3>
                    <p className="portal-muted mt-2 text-sm line-clamp-3">
                      {it?.text || "Texto editable desde el CMS."}
                    </p>

                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
                      <span style={{ color: "var(--portal-primary)" }}>
                        Ver más
                      </span>
                      <span
                        className="transition group-hover:translate-x-1"
                        style={{ color: "var(--portal-primary)" }}
                      >
                        →
                      </span>
                    </div>

                    {/* Debug útil (opcional) */}
                    {it?.image_asset_id && !it?.image_asset?.file_url && (
                      <p className="mt-2 text-[11px] text-amber-600">
                        Asset {it.image_asset_id} no encontrado o sin URL.
                      </p>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiciosMedicos;
