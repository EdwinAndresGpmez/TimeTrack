import React, { useMemo } from "react";
import RevealOnView from "./RevealOnView";

const Valores = ({ data }) => {
  const title = data?.title || "Nuestros valores";
  const subtitle =
    data?.subtitle ||
    "Sample text. Click to select the text box. Click again or double click to start editing the text.";

  const items = useMemo(() => {
    const arr = data?.items;
    if (Array.isArray(arr) && arr.length) return arr;

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
        <div className="portal-stagger mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {items.map((v, idx) => {
            const variant = idx % 4 === 0 ? "left" : idx % 4 === 1 ? "top" : idx % 4 === 2 ? "right" : "bottom";
            return (
              <RevealOnView key={idx} variant={variant} delay={idx * 90}>
                <div
                  className="portal-card portal-card-hover p-8"
                  style={{
                    backgroundColor: "var(--portal-surface)",
                    borderRadius: "var(--portal-radius)",
                  }}
                >
                  <h3 className="text-2xl font-extrabold" style={{ color: "var(--portal-text)" }}>
                    {v?.title || `Valor ${idx + 1}`}
                  </h3>
                  <p className="portal-muted mt-4 text-sm leading-relaxed">
                    {v?.text || "Texto editable desde el CMS."}
                  </p>
                </div>
              </RevealOnView>
            );
          })}
        </div>
        {data?.footnote && (
          <p className="portal-soft mt-6 text-center text-xs">
            {data.footnote}
          </p>
        )}
      </div>
    </section>
  );
};

export default Valores;

