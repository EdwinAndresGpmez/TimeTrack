import React, { useMemo } from "react";

const ComoTrabajamos = ({ data }) => {
  const title = data?.title || "Cómo trabajamos";

  // Imagen desde CMS: data.image_asset_id -> backend expande data.image_asset.file_url
  const imageUrl = data?.image_asset?.file_url || "";

  const leftText =
    data?.left_text ||
    "Texto editable del bloque izquierdo. Aquí puedes contar cómo funciona el servicio, tus procesos o tu metodología.";

  const rightText =
    data?.right_text ||
    "Texto editable del bloque derecho. Aquí puedes reforzar confianza, tiempos de respuesta, experiencia del equipo, etc.";

  const buttonText = data?.button_text || "CONTÁCTENOS";
  const buttonLink = data?.button_link || "#contacto";

  const hasContent = useMemo(() => Boolean(title || leftText || rightText || imageUrl), [
    title,
    leftText,
    rightText,
    imageUrl,
  ]);

  if (!hasContent) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch">
          {/* Imagen grande */}
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-[320px] w-full items-center justify-center text-sm text-slate-400">
                Sin imagen (asigna data.image_asset_id en CMS)
              </div>
            )}
          </div>

          {/* Bloque derecho estilo “tarjeta” */}
          <div
            className="rounded-2xl p-8 text-white shadow-sm"
            style={{
              backgroundColor: "var(--portal-primary)",
              borderRadius: "var(--portal-radius)",
            }}
          >
            <p className="text-xs tracking-[0.35em] uppercase text-white/85">
              {data?.subtitle || "Nuestro proceso"}
            </p>

            <h2 className="mt-3 text-4xl font-extrabold leading-tight">
              {title}
            </h2>

            <div className="mt-6 space-y-4 text-sm text-white/90 leading-relaxed">
              <p>{leftText}</p>
              <p>{rightText}</p>
            </div>

            <div className="mt-8">
              <a
                href={buttonLink}
                className="inline-flex items-center justify-center rounded-md bg-white px-7 py-3 text-sm font-extrabold transition hover:opacity-90"
                style={{
                  color: "var(--portal-primary)",
                  borderRadius: "calc(var(--portal-radius) - 6px)",
                }}
              >
                {buttonText}
              </a>
            </div>

            {/* Tip opcional */}
            {data?.image_asset_id && !data?.image_asset?.file_url && (
              <p className="mt-4 text-[11px] text-white/80">
                Asset {data.image_asset_id} no encontrado o sin URL.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComoTrabajamos;