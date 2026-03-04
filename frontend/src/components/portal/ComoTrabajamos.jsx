import React from "react";

const ComoTrabajamos = () => {
  return (
    <section className="bg-[#efefef]">
      {/* Imagen grande superior */}
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <p className="text-center text-xs text-slate-500">
          Imagen de <span className="underline">Stock</span>
        </p>

        <div className="mt-6 overflow-hidden bg-slate-100">
          {/* Cambia esta ruta por tu imagen real */}
          <img
            src="/assets/como-trabajamos.jpg"
            alt="Equipo médico"
            className="h-auto w-full object-cover"
          />
        </div>
      </div>

      {/* Bloque azul inferior */}
      <div className="mt-0 bg-[#2f7ecb]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-center text-4xl font-extrabold text-white lg:text-5xl">
            Cómo trabajamos
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Columna izquierda */}
            <div>
              <p className="text-sm leading-relaxed text-white/90">
                Sus departamentos están equipados con equipos de diagnóstico y
                terapéuticos de última generación y son operados por médicos de
                primera categoría, Ph.D y Doctores en Medicina, profesores
                asociados y profesores conocedores de las mejores prácticas
                disponibles de las escuelas europeas. Las asociaciones con
                clínicas especializadas y centros de investigación en Rusia y
                Europa hacen posibles las consultas de médicos de especialidades
                únicas.
              </p>
            </div>

            {/* Columna derecha */}
            <div>
              <p className="text-sm leading-relaxed text-white/90">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt mollit
                anim id est laborum.
              </p>

              <p className="mt-3 text-xs text-white/80">
                Imagen de <span className="underline">Freepik</span>
              </p>

              <div className="mt-7">
                <a
                  href="#contacto"
                  className="inline-flex items-center justify-center rounded-md border border-white/80
                             px-10 py-3 font-semibold text-white
                             transition hover:bg-white hover:text-[#2f7ecb]"
                >
                  CONTÁCTENOS
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComoTrabajamos;