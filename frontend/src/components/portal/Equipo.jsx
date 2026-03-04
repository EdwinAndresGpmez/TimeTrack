import React from "react";

const team = [
  {
    name: "Nombre Apellido",
    role: "Especialidad / Cargo",
    img: "/assets/equipo-1.jpg",
  },
  {
    name: "Nombre Apellido",
    role: "Especialidad / Cargo",
    img: "/assets/equipo-2.jpg",
  },
  {
    name: "Nombre Apellido",
    role: "Especialidad / Cargo",
    img: "/assets/equipo-3.jpg",
  },
  {
    name: "Nombre Apellido",
    role: "Especialidad / Cargo",
    img: "/assets/equipo-4.jpg",
  },
];

const Equipo = () => {
  return (
    <section className="bg-[#efefef]">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Título */}
        <div className="text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#2f7ecb]">
            Nuestro equipo
          </h2>
          <p className="mt-4 text-sm text-slate-500">
            Sample text. Click to select the text box. Click again or double
            click to start editing the text.
          </p>
        </div>

        {/* Cards equipo */}
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((p, idx) => (
            <article key={idx} className="bg-white shadow-sm border border-black/5">
              {/* Imagen */}
              <div className="aspect-[4/5] w-full overflow-hidden bg-slate-100">
                <img
                  src={p.img}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Texto */}
              <div className="p-6 text-center">
                <h3 className="text-lg font-extrabold text-slate-900">
                  {p.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{p.role}</p>

                {/* Social (opcional, similar a plantillas) */}
                <div className="mt-4 flex items-center justify-center gap-3">
                  <a
                    href="#"
                    aria-label="facebook"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-slate-700"
                      fill="currentColor"
                    >
                      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.7c0-2.4 1.4-3.7 3.6-3.7 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V12H18l-.4 3h-2.5v7A10 10 0 0 0 22 12z" />
                    </svg>
                  </a>

                  <a
                    href="#"
                    aria-label="twitter"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-slate-700"
                      fill="currentColor"
                    >
                      <path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.4-1.2 1.7-2.1-.8.5-1.6.8-2.5 1A4 4 0 0 0 10 8.5a11.3 11.3 0 0 1-8.2-4.2 4 4 0 0 0 1.2 5.3c-.6 0-1.2-.2-1.7-.5v.1a4 4 0 0 0 3.2 3.9c-.5.1-1.1.1-1.7.1.5 1.5 2 2.6 3.7 2.6A8.1 8.1 0 0 1 2 17.5 11.4 11.4 0 0 0 8.3 19c7.4 0 11.5-6.2 11.5-11.5v-.5c.8-.6 1.4-1.3 1.9-2.2z" />
                    </svg>
                  </a>

                  <a
                    href="#"
                    aria-label="instagram"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-slate-700"
                      fill="currentColor"
                    >
                      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9A3.5 3.5 0 0 0 20 16.5v-9A3.5 3.5 0 0 0 16.5 4h-9z" />
                      <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
                      <path d="M17.5 6.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                    </svg>
                  </a>
                </div>
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

export default Equipo;