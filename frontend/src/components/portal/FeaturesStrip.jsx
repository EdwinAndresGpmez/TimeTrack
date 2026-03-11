import React, { useMemo } from "react";

const IconMedical = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20" />
    <path d="M2 12h20" />
  </svg>
);

const IconPrograms = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </svg>
);

const resolveIcon = (key) => {
  const k = String(key || "").toLowerCase();
  if (k.includes("program")) return <IconPrograms />;
  if (k.includes("medical") || k.includes("medic")) return <IconMedical />;
  return <IconMedical />;
};

const FeaturesStrip = ({ data }) => {
  const items = useMemo(() => {
    const arr = data?.items;
    if (Array.isArray(arr) && arr.length) return arr.slice(0, 2);
    return [
      {
        title: "ATENCIÓN MÉDICA",
        text: "Texto editable. Puedes describir tu servicio.",
        icon: "medical",
      },
      {
        title: "PROGRAMAS DE ATENCIÓN",
        text: "Texto editable. Puedes describir tus programas.",
        icon: "programs",
      },
    ];
  }, [data]);

  return (
    <section
      className="portal-gradient-band text-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="portal-card-hover flex gap-5 rounded-xl bg-white/10 p-7 ring-1 ring-white/15 backdrop-blur-sm"
              style={{ borderRadius: "var(--portal-radius)" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                {resolveIcon(it?.icon)}
              </div>

              <div>
                <h3 className="text-lg font-extrabold tracking-wide">
                  {it?.title || "TÍTULO"}
                </h3>
                <p className="mt-2 text-sm text-white/90 leading-relaxed">
                  {it?.text || "Texto editable desde el CMS."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesStrip;

