import React from "react";

const items = [
  {
    title: "hospitalistas",
    text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
    img: "/assets/servicio-1.jpg",
    href: "#",
  },
  {
    title: "Pediatría",
    text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
    img: "/assets/servicio-2.jpg",
    href: "#",
  },
  {
    title: "Cuidado\ncrítico",
    text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
    img: "/assets/servicio-3.jpg",
    href: "#",
  },
  {
    title: "Laboratorio",
    text: "Sample text. Click to select the text box. Click again or double click to start editing the text.",
    img: "/assets/servicio-4.jpg",
    href: "#",
  },
];

const ServicioCard = ({ title, text, img, href }) => {
  return (
    <article className="grid grid-cols-1 gap-5 md:grid-cols-[240px_1fr] items-start">
      {/* Imagen */}
      <div className="w-full">
        <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <img
            src={img}
            alt={typeof title === "string" ? title : "servicio"}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* Texto */}
      <div>
        <h3 className="text-xl font-semibold text-slate-900 whitespace-pre-line">
          {title}
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 max-w-md">
          {text}
        </p>

        <a
          href={href}
          className="mt-4 inline-block text-xs font-semibold tracking-widest text-slate-900"
        >
          <span className="border-b border-slate-900 pb-1">APRENDE MÁS</span>
        </a>
      </div>
    </article>
  );
};

const ServiciosMedicos = () => {
  return (
    <section id="servicios" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-4xl lg:text-5xl font-extrabold text-[#2f7ecb]">
          Servicios médicos
        </h2>

        <p className="mt-4 text-center text-sm text-slate-500">
          Sample text. Click to select the text box. Click again or double click
          to start editing the text.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-14">
          {items.map((it, idx) => (
            <ServicioCard key={idx} {...it} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiciosMedicos;