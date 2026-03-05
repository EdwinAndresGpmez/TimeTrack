import React, { useMemo } from "react";

const Valores = ({ data }) => {
  const title = data?.title || "Nuestros valores";
  const subtitle =
    data?.subtitle ||
    "Sample text. Click to select the text box. Click again or double click to start editing the text.";

  const items = useMemo(() => {
    const arr = data?.items;
    if (Array.isArray(arr) && arr.length) return arr;

    // fallback (si aún no está configurado en CMS)
    return [
      {
        title: "Valor 1",
        text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
      },
      {
        title: "Valor 2",
        text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
      },
      {
        title: "Valor 3",
        text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
      },
      {
        title: "Valor 4",
        text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
      },
    ];
  }, [data]);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Título + intro */}
        <div className="text-center">
          <h2
            className="text-4xl lg:text-5xl font-extrabold"
            style={{ color: "var(--portal-primary)" }}
          >
            {title}
          </h2>
          <p className="mt-4 text-sm text-slate-500">{subtitle}</p>
        </div>

        {/* Grid */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {items.map((v, idx) => (
            <div
              key={idx}
              className="p-8 shadow-sm border border-black/5"
              style={{
                backgroundColor: "var(--portal-surface)",
                borderRadius: "var(--portal-radius)",
              }}
            >
              <h3 className="text-2xl font-extrabold text-slate-900">
                {v?.title || `Valor ${idx + 1}`}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {v?.text || "Texto editable desde el CMS."}
              </p>
            </div>
          ))}
        </div>

        {/* Línea opcional */}
        {data?.footnote && (
          <p className="mt-6 text-center text-xs text-slate-500">
            {data.footnote}
          </p>
        )}
      </div>
    </section>
  );
};

export default Valores;