import React, { useMemo } from "react";

const Testimonios = ({ data }) => {
  const title = data?.title || "Testimonios";
  const subtitle =
    data?.subtitle ||
    "Sample text. Click to select the text box. Click again or double click to start editing the text.";

  const items = useMemo(() => {
    const arr = data?.items;
    if (Array.isArray(arr) && arr.length) return arr;

    // fallback (cuando aún no configuras desde CMS)
    return [
      {
        name: "María P.",
        role: "Paciente",
        text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
        image_asset_id: null,
        image_asset: null,
      },
      {
        name: "Juan C.",
        role: "Paciente",
        text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
        image_asset_id: null,
        image_asset: null,
      },
      {
        name: "Laura G.",
        role: "Paciente",
        text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
        image_asset_id: null,
        image_asset: null,
      },
    ];
  }, [data]);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Título */}
        <div className="text-center">
          <h2
            className="text-4xl lg:text-5xl font-extrabold"
            style={{ color: "var(--portal-primary)" }}
          >
            {title}
          </h2>
          <p className="mt-4 text-sm text-slate-500">{subtitle}</p>
        </div>

        {/* Cards */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {items.map((t, idx) => {
            const avatar = t?.image_asset?.file_url || "";
            const name = t?.name || "Paciente";
            const role = t?.role || "";
            const text = t?.text || "Texto editable desde el CMS.";

            return (
              <article
                key={idx}
                className="border border-black/5 p-8 shadow-sm"
                style={{
                  backgroundColor: "var(--portal-surface)",
                  borderRadius: "var(--portal-radius)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-200">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                        Foto
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-slate-900 truncate">
                      {name}
                    </h3>
                    {role && <p className="text-xs text-slate-600 truncate">{role}</p>}

                    {t?.image_asset_id && !t?.image_asset?.file_url && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        Asset {t.image_asset_id} no encontrado o sin URL.
                      </p>
                    )}
                  </div>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-slate-600">
                  “{text}”
                </p>

                {/* Estrellitas */}
                <div
                  className="mt-5 flex gap-1"
                  aria-label="rating"
                  style={{ color: "var(--portal-primary)" }}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M12 17.3l-6.2 3.7 1.7-7.1L2 8.9l7.2-.6L12 2l2.8 6.3 7.2.6-5.5 5 1.7 7.1z" />
                    </svg>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {data?.footnote && (
          <p className="mt-6 text-center text-xs text-slate-500">
            {data.footnote}
          </p>
        )}
      </div>
    </section>
  );
};

export default Testimonios;