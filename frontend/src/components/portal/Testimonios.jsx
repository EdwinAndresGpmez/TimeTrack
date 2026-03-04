import React from "react";

const testimonios = [
  {
    name: "María P.",
    role: "Paciente",
    text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
    img: "/assets/testimonio-1.jpg",
  },
  {
    name: "Juan C.",
    role: "Paciente",
    text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
    img: "/assets/testimonio-2.jpg",
  },
  {
    name: "Laura G.",
    role: "Paciente",
    text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
    img: "/assets/testimonio-3.jpg",
  },
];

const Testimonios = () => {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Título */}
        <div className="text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#2f7ecb]">
            Testimonios
          </h2>
          <p className="mt-4 text-sm text-slate-500">
            Sample text. Click to select the text box. Click again or double
            click to start editing the text.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonios.map((t, idx) => (
            <article
              key={idx}
              className="border border-black/5 bg-[#efefef] p-8 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-200">
                  <img
                    src={t.img}
                    alt={t.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {t.name}
                  </h3>
                  <p className="text-xs text-slate-600">{t.role}</p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-slate-600">
                “{t.text}”
              </p>

              {/* Estrellitas opcionales */}
              <div className="mt-5 flex gap-1 text-[#2f7ecb]" aria-label="rating">
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
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Imagen de <span className="underline">Stock</span>
        </p>
      </div>
    </section>
  );
};

export default Testimonios;