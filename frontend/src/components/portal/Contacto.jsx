import React, { useMemo, useState } from "react";

const Contacto = ({ data, onAgendarCita, onIrPQRS }) => {
  const title = data?.title || "Contáctenos";
  const subtitle =
    data?.subtitle ||
    "Escríbenos o usa los canales de contacto. Esta sección es editable desde el CMS.";

  const phone = data?.phone || "+57 300 000 0000";
  const email = data?.email || "contacto@tuweb.com";
  const address = data?.address || "Calle 00 #00-00, Bogotá";

  const ctaPrimary = data?.cta_primary || { text: "Agendar cita", action: "AGENDAR_CITA" };
  const ctaSecondary = data?.cta_secondary || { text: "PQRS", action: "PQRS" };

  // Form “de contacto” simple (solo visual por ahora)
  const [form, setForm] = useState({ nombre: "", correo: "", mensaje: "" });
  const [sent, setSent] = useState(false);

  const handleAction = (action, e) => {
    const a = String(action || "").toUpperCase();

    if (a === "AGENDAR_CITA") {
      if (onAgendarCita) return onAgendarCita(e);
      return;
    }

    if (a === "PQRS") {
      if (onIrPQRS) return onIrPQRS();
      return;
    }

    // Si el CMS manda otra acción, permitir link directo:
    // ejemplo: { text:"WhatsApp", action:"LINK", link:"https://wa.me/..." }
    if (a === "LINK" && data?.link) {
      window.location.href = data.link;
    }
  };

  const primaryText = ctaPrimary?.text || "Agendar cita";
  const primaryAction = ctaPrimary?.action || "AGENDAR_CITA";

  const secondaryText = ctaSecondary?.text || "PQRS";
  const secondaryAction = ctaSecondary?.action || "PQRS";

  const canSubmit = useMemo(() => {
    return form.nombre.trim() && form.correo.trim() && form.mensaje.trim();
  }, [form]);

  const submitFake = (e) => {
    e.preventDefault();
    // Por ahora no hace POST. Luego si quieres lo conectamos a un endpoint real.
    setSent(true);
    setTimeout(() => setSent(false), 2500);
    setForm({ nombre: "", correo: "", mensaje: "" });
  };

  return (
    <section id="contacto" className="portal-section-alt">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="portal-fade-up text-center">
          <h2
            className="text-4xl lg:text-5xl font-extrabold"
            style={{ color: "var(--portal-primary)" }}
          >
            {title}
          </h2>
          <p className="portal-muted mt-4 text-sm">{subtitle}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Info + CTAs */}
          <div
            className="portal-card portal-card-hover rounded-2xl p-8"
            style={{ borderRadius: "var(--portal-radius)", backgroundColor: "var(--portal-surface)" }}
          >
            <p className="text-sm font-extrabold" style={{ color: "var(--portal-text)" }}>Información de contacto</p>

            <div className="portal-muted mt-5 space-y-3 text-sm">
              <p>
                <span className="font-bold">Dirección:</span> {address}
              </p>
              <p>
                <span className="font-bold">Teléfono:</span> {phone}
              </p>
              <p>
                <span className="font-bold">Email:</span> {email}
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={(e) => handleAction(primaryAction, e)}
                className="inline-flex flex-1 items-center justify-center rounded-md px-6 py-3 text-sm font-extrabold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--portal-primary)", borderRadius: "calc(var(--portal-radius) - 6px)" }}
              >
                {primaryText}
              </button>

              <button
                onClick={(e) => handleAction(secondaryAction, e)}
                className="inline-flex flex-1 items-center justify-center rounded-md border px-6 py-3 text-sm font-extrabold transition hover:bg-white"
                style={{
                  borderColor: "var(--portal-primary)",
                  color: "var(--portal-primary)",
                  borderRadius: "calc(var(--portal-radius) - 6px)",
                }}
              >
                {secondaryText}
              </button>
            </div>

            {data?.note && (
              <p className="portal-soft mt-5 text-xs">
                {data.note}
              </p>
            )}
          </div>

          {/* Formulario (visual por ahora) */}
          <div
            className="portal-card portal-card-hover rounded-2xl p-8"
            style={{ borderRadius: "var(--portal-radius)" }}
          >
            <p className="text-sm font-extrabold" style={{ color: "var(--portal-text)" }}>Envíanos un mensaje</p>
            <p className="portal-soft mt-2 text-xs">
              (Este formulario es configurable. Si quieres, luego lo conectamos a un endpoint real.)
            </p>

            <form onSubmit={submitFake} className="mt-6 space-y-4">
              <div>
                <label className="portal-muted text-xs font-bold">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2"
                  style={{ borderColor: "color-mix(in srgb, var(--portal-text) 16%, white 84%)", color: "var(--portal-text)" }}
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="portal-muted text-xs font-bold">Correo</label>
                <input
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2"
                  style={{ borderColor: "color-mix(in srgb, var(--portal-text) 16%, white 84%)", color: "var(--portal-text)" }}
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="portal-muted text-xs font-bold">Mensaje</label>
                <textarea
                  value={form.mensaje}
                  onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                  rows={5}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2"
                  style={{ borderColor: "color-mix(in srgb, var(--portal-text) 16%, white 84%)", color: "var(--portal-text)" }}
                  placeholder="Escribe tu mensaje..."
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex w-full items-center justify-center rounded-md px-6 py-3 text-sm font-extrabold text-white transition disabled:opacity-50"
                style={{ backgroundColor: "var(--portal-primary)", borderRadius: "calc(var(--portal-radius) - 6px)" }}
              >
                Enviar mensaje
              </button>

              {sent && (
                <p className="text-xs text-green-600 font-semibold">
                  Mensaje enviado (demo).
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contacto;
