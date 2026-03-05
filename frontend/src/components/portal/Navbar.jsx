import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaBars, FaTimes, FaPhone, FaWhatsapp } from "react-icons/fa";
import Swal from "sweetalert2";

const Navbar = ({ theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = useMemo(
    () => [
      { label: "Inicio", path: "/" },
      { label: "Servicios", path: "/servicios" },
      { label: "PQRS", path: "/pqrs" },
      { label: "Trabaje con Nosotros", path: "/trabaje-con-nosotros" },
    ],
    []
  );

  const handleAgendarClick = (e) => {
    e.preventDefault();
    localStorage.setItem("intencionCita", "PARTICULAR");

    Swal.fire({
      title: "¿Ya tienes cuenta con nosotros?",
      text: "Para agendar tu cita necesitamos identificarte",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "var(--portal-primary)",
      cancelButtonColor: "var(--portal-secondary)",
      confirmButtonText: "Sí, Ingresar",
      cancelButtonText: "No, Registrarme",
    }).then((result) => {
      if (result.isConfirmed) navigate("/login");
      else if (result.dismiss === Swal.DismissReason.cancel) navigate("/register");
    });
  };

  const isActive = (path) => location.pathname === path;

  const brandName = theme?.company_name || "Tu Clínica";
  const logoUrl = theme?.logo_url || "";

  return (
    <header className="sticky top-0 z-50">
      {/* Top strip */}
      <div
        className="text-white"
        style={{ backgroundColor: "var(--portal-primary)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-2">
                <FaPhone />
                +57 300 000 0000
              </span>
              <span className="hidden sm:inline-flex items-center gap-2">
                <FaWhatsapp />
                WhatsApp disponible
              </span>
            </div>

            <a
              href="#contacto"
              className="text-xs font-semibold underline underline-offset-4 hover:opacity-90"
            >
              Contáctenos
            </a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="h-10 w-10 rounded object-cover bg-slate-100"
                  style={{ borderRadius: "var(--portal-radius)" }}
                  onError={(e) => {
                    // fallback si el logo no carga por ruta/mime
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="h-10 w-10 rounded opacity-90"
                  style={{
                    backgroundColor: "var(--portal-primary)",
                    borderRadius: "var(--portal-radius)",
                  }}
                />
              )}

              <div className="leading-tight">
                <p className="text-base font-extrabold text-slate-900">
                  {brandName}
                </p>
                <p className="text-xs text-slate-500">Centro médico de salud</p>
              </div>
            </Link>

            {/* Desktop menu */}
            <div className="hidden items-center gap-6 lg:flex">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-semibold transition ${
                    isActive(item.path)
                      ? "text-[var(--portal-primary)]"
                      : "text-slate-700 hover:text-[var(--portal-primary)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              <button
                onClick={handleAgendarClick}
                className="rounded-md px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                style={{ backgroundColor: "var(--portal-primary)" }}
              >
                Agendar cita
              </button>
            </div>

            {/* Mobile button */}
            <button
              onClick={() => setIsOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-700 lg:hidden"
              aria-label="Abrir menú"
            >
              {isOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>

          {/* Mobile menu */}
          {isOpen && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 lg:hidden">
              <div className="flex flex-col gap-3">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-semibold ${
                      isActive(item.path)
                        ? "text-[var(--portal-primary)]"
                        : "text-slate-700 hover:text-[var(--portal-primary)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}

                <button
                  onClick={(e) => {
                    setIsOpen(false);
                    handleAgendarClick(e);
                  }}
                  className="mt-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                  style={{ backgroundColor: "var(--portal-primary)" }}
                >
                  Agendar cita
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;