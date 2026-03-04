import React from "react";

const FeaturesStrip = () => {
  return (
    <section className="bg-[#2f7ecb]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Item 1 */}
          <div className="flex items-start gap-6">
            {/* Icono circular */}
            <div className="shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/70">
                {/* Ícono simple (puedes reemplazar por SVG o imagen) */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-10 w-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                  <path d="M2 12h4" />
                  <path d="M18 12h4" />
                  <path d="M7 7l2.5 2.5" />
                  <path d="M14.5 14.5L17 17" />
                  <path d="M17 7l-2.5 2.5" />
                  <path d="M9.5 14.5L7 17" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
              </div>
            </div>

            {/* Texto */}
            <div>
              <h3 className="text-lg font-bold tracking-wide text-white">
                ATENCIÓN MÉDICA
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/90 max-w-md">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt.
              </p>
            </div>
          </div>

          {/* Item 2 */}
          <div className="flex items-start gap-6">
            {/* Icono circular */}
            <div className="shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/70">
                {/* Ícono estetoscopio */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-10 w-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 3v6a4 4 0 0 0 8 0V3" />
                  <path d="M10 13v2a4 4 0 0 0 8 0v-1" />
                  <circle cx="19" cy="14" r="2" />
                  <path d="M6 3h4" />
                  <path d="M14 3h-4" />
                </svg>
              </div>
            </div>

            {/* Texto */}
            <div>
              <h3 className="text-lg font-bold tracking-wide text-white">
                PROGRAMAS DE ATENCIÓN
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/90 max-w-md">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;