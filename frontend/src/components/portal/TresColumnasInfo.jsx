import React, { useMemo } from "react";
import RevealOnView from "./RevealOnView";

const TresColumnasInfo = ({ data }) => {
  // Estructura esperada del CMS:
  // data = {
  //   title: "Título sección",
  //   subtitle: "Texto...",
  //   columns: [
  //     { title:"UN", subtitle:"...", text:"...", image_asset:{file_url:"..."} },
  //     { title:"B",  subtitle:"...", text:"...", image_asset:{file_url:"..."} },
  //     { title:"C",  subtitle:"...", text:"...", image_asset:{file_url:"..."} }
  //   ]
  // }

  const title = data?.title || "";
  const subtitle = data?.subtitle || "";

  const columns = useMemo(() => {
    const arr = data?.columns;
    if (Array.isArray(arr) && arr.length) return arr.slice(0, 3);

    // fallback (si aún no está en CMS)
    return [
      {
        title: "UN",
        subtitle: "Título columna 1",
        text: "Contenido editable desde el CMS (columna 1).",
        image_asset_id: null,
        image_asset: null,
      },
      {
        title: "B",
        subtitle: "Título columna 2",
        text: "Contenido editable desde el CMS (columna 2).",
        image_asset_id: null,
        image_asset: null,
      },
      {
        title: "C",
        subtitle: "Título columna 3",
        text: "Contenido editable desde el CMS (columna 3).",
        image_asset_id: null,
        image_asset: null,
      },
    ];
  }, [data]);

  // Si no hay nada en absoluto, no renderiza
  const hasAny = Boolean(title || subtitle || (columns && columns.length));
  if (!hasAny) return null;

  return (
    <section className="portal-section-alt py-16">
      <div className="mx-auto max-w-6xl px-4">
        {(title || subtitle) && (
          <div className="portal-fade-up text-center">
            {title && (
              <h2
                className="text-4xl lg:text-5xl font-extrabold"
                style={{ color: "var(--portal-primary)" }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="portal-muted mt-4 text-sm">{subtitle}</p>
            )}
          </div>
        )}

        <div className="portal-stagger mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {columns.map((c, idx) => {
            const imgUrl = c?.image_asset?.file_url || "";
            const variant = idx % 4 === 0 ? "left" : idx % 4 === 1 ? "top" : idx % 4 === 2 ? "right" : "bottom";
            return (
              <RevealOnView key={idx} variant={variant} delay={idx * 90}>
                <div
                  className="portal-card portal-card-hover rounded-2xl p-7"
                  style={{ borderRadius: "var(--portal-radius)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white font-extrabold"
                      style={{ backgroundColor: "var(--portal-primary)" }}
                    >
                      {(c?.title || "").slice(0, 2) || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-extrabold truncate" style={{ color: "var(--portal-text)" }}>
                        {c?.subtitle || `Columna ${idx + 1}`}
                      </p>
                      {c?.small && (
                        <p className="portal-soft text-xs truncate">{c.small}</p>
                      )}
                    </div>
                  </div>

                  {imgUrl && (
                    <div className="mt-5 overflow-hidden rounded-xl" style={{ backgroundColor: "var(--portal-surface)" }}>
                      <img
                        src={imgUrl}
                        alt={c?.subtitle || "imagen"}
                        className="h-40 w-full object-cover transition duration-500 hover:scale-[1.03]"
                      />
                    </div>
                  )}

                  <p className="portal-muted mt-5 text-sm leading-relaxed">
                    {c?.text || "Texto editable desde el CMS."}
                  </p>

                  {c?.image_asset_id && !c?.image_asset?.file_url && (
                    <p className="mt-2 text-[11px] text-amber-600">
                      Asset {c.image_asset_id} no encontrado o sin URL.
                    </p>
                  )}
                </div>
              </RevealOnView>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TresColumnasInfo;
