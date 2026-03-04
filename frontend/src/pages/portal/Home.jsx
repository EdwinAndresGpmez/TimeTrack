import React from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import Navbar from "../../components/portal/Navbar";
import Footer from "../../components/portal/Footer";

// NUEVOS COMPONENTES (los crearemos uno a uno)
import HeroMedical from "../../components/portal/HeroMedical";
import FeaturesStrip from "../../components/portal/FeaturesStrip";
import ServiciosMedicos from "../../components/portal/ServiciosMedicos";
import ComoTrabajamos from "../../components/portal/ComoTrabajamos";
import TresColumnasInfo from "../../components/portal/TresColumnasInfo";
import Valores from "../../components/portal/Valores";
import Equipo from "../../components/portal/Equipo";
import Testimonios from "../../components/portal/Testimonios";
import Contacto from "../../components/portal/Contacto";

const Home = () => {
  const navigate = useNavigate();

  const handleCitaParticular = (e) => {
    e.preventDefault();

    // 1) Guardar intención
    localStorage.setItem("intencionCita", "PARTICULAR");

    // 2) Preguntar ruta (Login o Registro)
    Swal.fire({
      title: "¿Ya tienes cuenta con nosotros?",
      text: "Para agendar tu cita necesitamos identificarte",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#28a745",
      confirmButtonText: "Sí, Ingresar",
      cancelButtonText: "No, Registrarme",
    }).then((result) => {
      if (result.isConfirmed) navigate("/login");
      else if (result.dismiss === Swal.DismissReason.cancel) navigate("/register");
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <main>
        {/* 1) HERO (como imagen 1) */}
        <HeroMedical />

        {/* 2) FRANJA AZUL con 2 bloques (Atención médica / Programas) */}
        <FeaturesStrip />

        {/* 3) Servicios médicos (grid 2x2 como imagen 2) */}
        <ServiciosMedicos />

        {/* 4) Cómo trabajamos (imagen grande + bloque azul como imagen 3) */}
        <ComoTrabajamos />

        {/* 5) 3 columnas UN / B / C (como imagen 4) */}
        <TresColumnasInfo />

        {/* 6) Valores (como imagen 5) */}
        <Valores />

        {/* 7) Equipo (como imagen 6) */}
        <Equipo />

        {/* 8) Testimonios (como imagen 7) */}
        <Testimonios />

        {/* 9) Contacto (como imagen 8)
            - Te dejo integrados tus CTAs actuales (Cita / PQRS) en el form.
        */}
        <Contacto
          onAgendarCita={handleCitaParticular}
          onIrPQRS={() => navigate("/pqrs")}
        />
      </main>

      <Footer />
    </div>
  );
};

export default Home;