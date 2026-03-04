import React, { useMemo, useState } from "react";

const Contacto = ({ onAgendarCita, onIrPQRS }) => {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    mensaje: "",
  });

  const [status, setStatus] = useState({
    loading: false,
    ok: null, // true/false/null
    msg: "",
  });

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).toLowerCase());

  const errors = useMemo(() => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es requerido.";
    if (!form.email.trim()) e.email = "El correo es requerido.";
    else if (!isValidEmail(form.email)) e.email = "Correo no válido.";
    if (!form.mensaje.trim()) e.mensaje = "El mensaje es requerido.";
    return e;
  }, [form]);

  const canSubmit = Object.keys(errors).length === 0 && !status.loading;

  const handleChange = (ev) => {
    const { name, value } = ev.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();

    // Validación simple
    if (!canSubmit) {
      setStatus({
        loading: false,
        ok: false,
        msg: "Por favor completa los campos requeridos correctamente.",
      });
      return;
    }

    try {
      setStatus({ loading: true, ok: null, msg: "" });

      /**
       * ✅ Por ahora NO llamo backend (porque no me pasaste endpoint).
       * Cuando me pases el endpoint, aquí hacemos el fetch:
       * await fetch("TU_URL", { method:"POST", headers:{...}, body: JSON.stringify(form) })
       */

      // Simulación de envío exitoso
      await new Promise((r) => setTimeout(r, 600));

      setStatus({
        loading: false,
        ok: true,
        msg: "¡Listo! Hemos recibido tu mensaje. Te contactaremos pronto.",
      });

      setForm({
        nombre: "",
        email: "",
        telefono: "",
        mensaje: "",
      });
    } catch (err) {
      setStatus({
        loading: false,
        ok: false,
        msg: "Ocurrió un error enviando el mensaje. Intenta de nuevo.",
      });
    }
  };

  return (
    <section id="contacto" className="bg-[#efefef]">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* Título */}
        <div className="text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#2f7ecb]">
            Contáctenos
          </h2>
          <p className="mt-4 text-sm text-slate-500">
            Sample text. Click to select the text box. Click again or double
            click to start editing the text.
          </p>
        </div>

        {/* Contenido */}
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2 items-start">
          {/* Izquierda: info + CTAs */}
          <div className="bg-white p-8 shadow-sm border border-black/5">
            <h3 className="text-2xl font-extrabold text-slate-900">
              ¿Necesitas ayuda?
            </h3>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Puedes escribirnos por este formulario o usar las opciones rápidas
              para agendar tu cita o radicar una PQRS.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2f7ecb] text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L9.9 10.6a16 16 0 0 0 3.5 3.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Teléfono
                  </p>
                  <p className="text-sm text-slate-600">+57 300 000 0000</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2f7ecb] text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16v16H4z" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Correo</p>
                  <p className="text-sm text-slate-600">contacto@tuweb.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2f7ecb] text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Dirección
                  </p>
                  <p className="text-sm text-slate-600">
                    Calle 00 #00-00, Bogotá
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onAgendarCita}
                className="rounded-md bg-[#2f7ecb] px-5 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Agendar cita
              </button>

              <button
                type="button"
                onClick={onIrPQRS}
                className="rounded-md border border-[#2f7ecb] px-5 py-3 font-semibold text-[#2f7ecb] transition hover:bg-[#2f7ecb] hover:text-white"
              >
                PQRS
              </button>
            </div>
          </div>

          {/* Derecha: formulario */}
          <div className="bg-white p-8 shadow-sm border border-black/5">
            <h3 className="text-2xl font-extrabold text-slate-900">
              Envíanos un mensaje
            </h3>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Nombre *
                </label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2f7ecb]"
                  placeholder="Tu nombre"
                />
                {errors.nombre && (
                  <p className="mt-1 text-xs text-red-600">{errors.nombre}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Correo *
                </label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2f7ecb]"
                  placeholder="tucorreo@correo.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Teléfono (opcional)
                </label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2f7ecb]"
                  placeholder="+57 3xx xxx xxxx"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Mensaje *
                </label>
                <textarea
                  name="mensaje"
                  value={form.mensaje}
                  onChange={handleChange}
                  rows={5}
                  className="mt-2 w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2f7ecb]"
                  placeholder="Cuéntanos en qué podemos ayudarte..."
                />
                {errors.mensaje && (
                  <p className="mt-1 text-xs text-red-600">{errors.mensaje}</p>
                )}
              </div>

              {status.msg && (
                <div
                  className={`rounded-md px-4 py-3 text-sm ${
                    status.ok
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {status.msg}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-md bg-[#2f7ecb] px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {status.loading ? "Enviando..." : "Enviar"}
              </button>

              <p className="text-xs text-slate-500 text-center">
                Imagen de <span className="underline">Stock</span>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contacto;