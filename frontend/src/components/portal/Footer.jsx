import React from "react";
import {
  FaFacebook,
  FaInstagram,
  FaWhatsapp,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const Footer = ({ theme, contactData, servicesData }) => {
  const brandName = theme?.company_name || "Tu Clínica";
  const logoUrl = theme?.logo_url || "";

  // Contacto desde CMS (sección contact.data)
  const address = contactData?.address || "Calle 00 #00-00, Bogotá";
  const phone = contactData?.phone || "+57 300 000 0000";
  const email = contactData?.email || "contacto@tuweb.com";

  // Servicios desde CMS (sección services.data.items)
  const servicesItems =
    Array.isArray(servicesData?.items) && servicesData.items.length
      ? servicesData.items.slice(0, 4).map((x) => x?.title).filter(Boolean)
      : ["Medicina general", "Pediatría", "Laboratorio", "Cuidado crítico"];

  return (
    <footer className="portal-gradient-band text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              {/* Logo */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="h-10 w-10 rounded bg-white/15 ring-1 ring-white/30 object-cover"
                  style={{ borderRadius: "var(--portal-radius)" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="h-10 w-10 rounded bg-white/15 ring-1 ring-white/30"
                  style={{ borderRadius: "var(--portal-radius)" }}
                />
              )}

              <div>
                <p className="text-lg font-extrabold leading-tight">
                  {brandName}
                </p>
                <p className="text-xs text-white/80">Centro médico de salud</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-white/85">
              Atención médica integral con profesionales capacitados, enfoque humano
              y tecnología para tu bienestar.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <FaFacebook />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <FaInstagram />
              </a>
              <a
                href="#"
                aria-label="Whatsapp"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <FaWhatsapp />
              </a>
            </div>
          </div>

          {/* Col 2: Enlaces */}
          <div>
            <h4 className="text-sm font-extrabold tracking-wider">ENLACES</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/85">
              <li>
                <Link to="/" className="hover:text-white">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/servicios" className="hover:text-white">
                  Servicios
                </Link>
              </li>
              <li>
                <Link to="/pqrs" className="hover:text-white">
                  PQRS
                </Link>
              </li>
              <li>
                <Link to="/trabaje-con-nosotros" className="hover:text-white">
                  Trabaje con nosotros
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Servicios */}
          <div>
            <h4 className="text-sm font-extrabold tracking-wider">SERVICIOS</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/85">
              {servicesItems.map((s, idx) => (
                <li key={idx} className="hover:text-white cursor-default">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contacto */}
          <div>
            <h4 className="text-sm font-extrabold tracking-wider">CONTACTO</h4>

            <div className="mt-4 space-y-4 text-sm text-white/85">
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="mt-1 shrink-0" />
                <p>{address}</p>
              </div>
              <div className="flex items-start gap-3">
                <FaPhoneAlt className="mt-1 shrink-0" />
                <p>{phone}</p>
              </div>
              <div className="flex items-start gap-3">
                <FaEnvelope className="mt-1 shrink-0" />
                <p>{email}</p>
              </div>
            </div>

            <a
              href="#contacto"
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-white px-5 py-3 font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
              style={{ color: "var(--portal-primary)" }}
            >
              Contáctenos
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-white/20 pt-6 text-center text-xs text-white/80">
          © {new Date().getFullYear()} {brandName}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
