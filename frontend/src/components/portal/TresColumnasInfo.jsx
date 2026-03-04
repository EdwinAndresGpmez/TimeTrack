import React from "react";

const TresColumnasInfo = () => {
  return (
    <section className="bg-[#efefef]">
      <div className="mx-auto max-w-6xl px-4 py-14">
        {/* 3 columnas UN / B / C */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* UN */}
          <div className="bg-white p-8 shadow-sm">
            <p className="text-xs font-bold tracking-[0.35em] text-slate-400">
              UN
            </p>
            <h3 className="mt-3 text-2xl font-extrabold text-slate-900">
              Metas y misión
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              La clínica es el principal centro científico y clínico del país, que
              implementa el diagnóstico y tratamiento más moderno de enfermedades
              en el ámbito de la atención médica.
            </p>
          </div>

          {/* B */}
          <div className="bg-white p-8 shadow-sm">
            <p className="text-xs font-bold tracking-[0.35em] text-slate-400">
              B
            </p>
            <h3 className="mt-3 text-2xl font-extrabold text-slate-900">
              Acerca de
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
              cupidatat non proident.
            </p>
          </div>

          {/* C */}
          <div className="bg-white p-8 shadow-sm">
            <p className="text-xs font-bold tracking-[0.35em] text-slate-400">
              C
            </p>
            <h3 className="mt-3 text-2xl font-extrabold text-slate-900">
              Trabaja con nosotros
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
              cupidatat non proident.
            </p>
          </div>
        </div>

        {/* Bloque "Servicios de atención médica" + imagen derecha */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 items-center">
          {/* Texto izquierda */}
          <div>
            <h2 className="text-4xl font-extrabold text-[#2f7ecb] lg:text-5xl">
              Servicios de atención <br className="hidden lg:block" /> médica
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-slate-600 max-w-xl">
              Sample text. Click to select the text box. Click again or double
              click to start editing the text. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
              pariatur.
            </p>

            <div className="mt-7">
              <a
                href="#contacto"
                className="inline-flex items-center justify-center rounded-md bg-[#2f7ecb]
                           px-10 py-3 font-semibold text-white transition hover:opacity-90"
              >
                CONTÁCTENOS
              </a>
            </div>
          </div>

          {/* Imagen derecha */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md overflow-hidden bg-slate-100">
              {/* Cambia esta ruta por tu imagen real */}
              <img
                src="/assets/servicios-atencion.jpg"
                alt="Servicios de atención médica"
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Imagen de <span className="underline">Stock</span>
        </p>
      </div>
    </section>
  );
};

export default TresColumnasInfo;