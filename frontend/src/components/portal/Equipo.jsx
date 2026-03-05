import React, { useMemo } from "react";

const Equipo = ({ data }) => {
  const title = data?.title || "Nuestro equipo";
  const subtitle =
    data?.subtitle ||
    "Conoce a nuestro equipo médico y profesional. Contenido editable desde el CMS.";

  const members = useMemo(() => {
    const arr = data?.members;
    if (Array.isArray(arr) && arr.length) return arr;

    // fallback si aún no está configurado en CMS
    return [
      { name: "Nombre Apellido", role: "Especialidad", image_asset_id: null, image_asset: null },
      { name: "Nombre Apellido", role: "Especialidad", image_asset_id: null, image_asset: null },
      { name: "Nombre Apellido", role: "Especialidad", image_asset_id: null, image_asset: null },
      { name: "Nombre Apellido", role: "Especialidad", image_asset_id: null, image_asset: null },
    ];
  }, [data]);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2
            className="text-4xl lg:text-5xl font-extrabold"
            style={{ color: "var(--portal-primary)" }}
          >
            {title}
          </h2>
          <p className="mt-4 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, idx) => {
            const imgUrl = m?.image_asset?.file_url || "";
            const name = m?.name || "Nombre Apellido";
            const role = m?.role || "Especialidad";

            return (
              <div
                key={idx}
                className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
                style={{ borderRadius: "var(--portal-radius)" }}
              >
                <div className="h-56 w-full bg-slate-100 overflow-hidden">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={name}
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="p-5 text-center">
                  <p className="text-base font-extrabold text-slate-900 truncate">
                    {name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 truncate">{role}</p>

                  {m?.image_asset_id && !m?.image_asset?.file_url && (
                    <p className="mt-2 text-[11px] text-amber-600">
                      Asset {m.image_asset_id} no encontrado o sin URL.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Equipo;