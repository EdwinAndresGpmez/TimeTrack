import React, { useMemo } from "react";
import RevealOnView from "./RevealOnView";

const Equipo = ({ data }) => {
  const title = data?.title || "Nuestro equipo";
  const subtitle =
    data?.subtitle ||
    "Conoce a nuestro equipo médico y profesional. Contenido editable desde el CMS.";

  const members = useMemo(() => {
    const arr = data?.members;
    if (Array.isArray(arr) && arr.length) return arr;

    return [
      { name: "Nombre Apellido", role: "Especialidad", image_asset_id: null, image_asset: null },
      { name: "Nombre Apellido", role: "Especialidad", image_asset_id: null, image_asset: null },
      { name: "Nombre Apellido", role: "Especialidad", image_asset_id: null, image_asset: null },
      { name: "Nombre Apellido", role: "Especialidad", image_asset_id: null, image_asset: null },
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

        <div className="portal-stagger mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, idx) => {
            const imgUrl = m?.image_asset?.file_url || "";
            const name = m?.name || "Nombre Apellido";
            const role = m?.role || "Especialidad";
            const variant = idx % 4 === 0 ? "left" : idx % 4 === 1 ? "top" : idx % 4 === 2 ? "right" : "bottom";

            return (
              <RevealOnView key={idx} variant={variant} delay={idx * 90}>
                <div
                  className="portal-card portal-card-hover group overflow-hidden rounded-2xl"
                  style={{ borderRadius: "var(--portal-radius)" }}
                >
                  <div className="h-56 w-full overflow-hidden" style={{ backgroundColor: "var(--portal-surface)" }}>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={name}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="portal-soft flex h-full w-full items-center justify-center text-xs">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="p-5 text-center">
                    <p className="text-base font-extrabold truncate" style={{ color: "var(--portal-text)" }}>
                      {name}
                    </p>
                    <p className="portal-muted mt-1 text-sm truncate">{role}</p>

                    {m?.image_asset_id && !m?.image_asset?.file_url && (
                      <p className="mt-2 text-[11px] text-amber-600">
                        Asset {m.image_asset_id} no encontrado o sin URL.
                      </p>
                    )}
                  </div>
                </div>
              </RevealOnView>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Equipo;

