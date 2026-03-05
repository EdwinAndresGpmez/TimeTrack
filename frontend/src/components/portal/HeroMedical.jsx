import React, { useEffect, useMemo, useState } from "react";

const pickImage = (banner, isMobile) => {
  if (!banner) return "";
  const mobile = banner.imagen_movil_url || "";
  const desktop = banner.imagen_desktop_url || "";
  if (isMobile) return mobile || desktop;
  return desktop || mobile;
};

const HeroMedical = ({ data }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [index, setIndex] = useState(0);

  const slides = useMemo(() => {
    const arr = data?.slides;
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  const autoplayMs = useMemo(() => {
    const v = Number(data?.autoplay_ms);
    return Number.isFinite(v) && v > 500 ? v : 6000;
  }, [data]);

  // viewport
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // autoplay
  useEffect(() => {
    if (!slides.length) return;
    const t = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(t);
  }, [slides.length, autoplayMs]);

  // clamp index when slides change
  useEffect(() => {
    if (!slides.length) {
      setIndex(0);
      return;
    }
    if (index > slides.length - 1) setIndex(0);
    // eslint-disable-next-line
  }, [slides.length]);

  const activeSlide = slides[index] || null;
  const activeBanner = activeSlide?.banner || null;

  // Textos (primero desde data, si no, fallback a banner, si no, default)
  const subtitle =
    data?.subtitle || "Centro médico de salud";

  const title =
    activeSlide?.title ||
    activeBanner?.titulo ||
    data?.title ||
    "De la máxima calidad";

  const description =
    activeSlide?.description ||
    activeBanner?.descripcion ||
    data?.description ||
    "Para obtener más información sobre nuestros programas clínicos, explore nuestra lista de servicios médicos.";

  const buttonText = data?.button_text || "CONTÁCTENOS";
  const buttonLink =
    activeSlide?.link ||
    activeBanner?.link_accion ||
    data?.button_link ||
    "#contacto";

  const img = pickImage(activeBanner, isMobile);

  return (
    <section
      className="bg-[var(--portal-surface)]"
      style={{ backgroundColor: "var(--portal-surface)" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Imagen */}
          <div className="flex justify-center lg:justify-start">
            <div className="w-full max-w-md">
              {img ? (
                <img
                  src={img}
                  alt={title}
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="aspect-[4/3] w-full rounded bg-white/60 flex items-center justify-center text-slate-500 text-sm">
                  Sin imagen de banner
                </div>
              )}

              {/* Bullets */}
              {slides.length > 1 && (
                <div className="mt-4 flex items-center justify-center lg:justify-start gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`h-2.5 w-2.5 rounded-full transition ${
                        i === index
                          ? "opacity-100"
                          : "opacity-40 hover:opacity-70"
                      }`}
                      style={{
                        backgroundColor:
                          i === index
                            ? "var(--portal-primary)"
                            : "var(--portal-secondary)",
                      }}
                      aria-label={`Ir al banner ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Texto */}
          <div className="text-center lg:text-left">
            <p
              className="text-xs tracking-[0.35em] uppercase"
              style={{ color: "var(--portal-secondary)" }}
            >
              {subtitle}
            </p>

            <h1
              className="mt-3 text-4xl font-extrabold leading-tight lg:text-5xl whitespace-pre-line"
              style={{ color: "var(--portal-primary)" }}
            >
              {title}
            </h1>

            <p className="mt-5 max-w-xl text-slate-600 lg:mx-0 mx-auto">
              {description}
            </p>

            <div className="mt-7">
              <a
                href={buttonLink}
                className="inline-flex items-center justify-center rounded-md border px-8 py-3 font-semibold transition"
                style={{
                  borderColor: "var(--portal-primary)",
                  color: "var(--portal-primary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--portal-primary)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--portal-primary)";
                }}
              >
                {buttonText}
              </a>
            </div>

            {/* Debug suave (opcional): si no hay slides */}
            {slides.length === 0 && (
              <p className="mt-4 text-xs text-slate-400">
                No hay slides configurados en CMS (hero.data.slides).
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroMedical;