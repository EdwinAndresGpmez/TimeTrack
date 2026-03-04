import React from "react";

const valores = [
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

const Valores = () => {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Título + intro */}
        <div className="text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#2f7ecb]">
            Nuestros valores
          </h2>
          <p className="mt-4 text-sm text-slate-500">
            Sample text. Click to select the text box. Click again or double
            click to start editing the text.
          </p>
        </div>

        {/* Grid (similar a tu captura: tarjetas limpias) */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {valores.map((v, idx) => (
            <div
              key={idx}
              className="bg-[#efefef] p-8 shadow-sm border border-black/5"
            >
              <h3 className="text-2xl font-extrabold text-slate-900">
                {v.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {v.text}
              </p>
            </div>
          ))}
        </div>

        {/* Línea de fuente opcional como en las capturas */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Imagen de <span className="underline">Stock</span>
        </p>
      </div>
    </section>
  );
};

export default Valores;