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

const Footer = () => {
  return (
    <footer className="bg-[#2f7ecb] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              {/* Cambia por tu logo real si tienes */}
              <div className="h-10 w-10 rounded bg-white/15 ring-1 ring-white/30" />
              <div>
                <p className="text-lg font-extrabold leading-tight">Tu Clínica</p>
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

          {/* Col 3: Servicios (puedes cambiar textos) */}
          <div>
            <h4 className="text-sm font-extrabold tracking-wider">SERVICIOS</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/85">
              <li className="hover:text-white cursor-default">Medicina general</li>
              <li className="hover:text-white cursor-default">Pediatría</li>
              <li className="hover:text-white cursor-default">Laboratorio</li>
              <li className="hover:text-white cursor-default">Cuidado crítico</li>
            </ul>
          </div>

          {/* Col 4: Contacto */}
          <div>
            <h4 className="text-sm font-extrabold tracking-wider">CONTACTO</h4>

            <div className="mt-4 space-y-4 text-sm text-white/85">
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="mt-1 shrink-0" />
                <p>Calle 00 #00-00, Bogotá</p>
              </div>
              <div className="flex items-start gap-3">
                <FaPhoneAlt className="mt-1 shrink-0" />
                <p>+57 300 000 0000</p>
              </div>
              <div className="flex items-start gap-3">
                <FaEnvelope className="mt-1 shrink-0" />
                <p>contacto@tuweb.com</p>
              </div>
            </div>

            <a
              href="#contacto"
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-white px-5 py-3 font-semibold text-[#2f7ecb] hover:opacity-90 transition"
            >
              Contáctenos
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-white/20 pt-6 text-center text-xs text-white/80">
          © {new Date().getFullYear()} Tu Clínica. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;