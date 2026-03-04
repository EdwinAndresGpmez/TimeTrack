import React from "react";

const HeroMedical = () => {
  return (
    <section className="bg-[#d9ecfb]">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Imagen izquierda */}
          <div className="flex justify-center lg:justify-start">
            <div className="w-full max-w-md">
              {/* Cambia esta ruta por tu imagen real */}
              <img
                src="/assets/hero-doctor.png"
                alt="Personal médico"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* Texto derecha */}
          <div className="text-center lg:text-left">
            <p className="text-xs tracking-[0.35em] uppercase text-slate-700">
              Centro médico de salud
            </p>

            <h1 className="mt-3 text-4xl font-extrabold leading-tight text-[#2f7ecb] lg:text-5xl">
              De la máxima <br className="hidden lg:block" /> calidad
            </h1>

            <p className="mt-5 max-w-xl text-slate-600 lg:mx-0 mx-auto">
              Para obtener más información sobre nuestros programas clínicos,
              explore nuestra lista de servicios médicos en orden alfabético o
              busque por palabra clave en el cuadro a continuación.
            </p>

            <div className="mt-7">
              <a
                href="#contacto"
                className="inline-flex items-center justify-center rounded-md border border-[#2f7ecb]
                           px-8 py-3 font-semibold text-[#2f7ecb]
                           transition hover:bg-[#2f7ecb] hover:text-white"
              >
                CONTÁCTENOS
              </a>
            </div>

            {/* línea pequeña tipo “Imagen de …” (opcional, como en tu captura) */}
            <p className="mt-3 text-xs text-slate-500">
              Imagen de <span className="underline">Stock</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroMedical;