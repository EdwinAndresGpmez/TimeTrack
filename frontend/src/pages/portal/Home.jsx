import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import Navbar from "../../components/portal/Navbar";
import Footer from "../../components/portal/Footer";

import HeroMedical from "../../components/portal/HeroMedical";
import FeaturesStrip from "../../components/portal/FeaturesStrip";
import ServiciosMedicos from "../../components/portal/ServiciosMedicos";
import ComoTrabajamos from "../../components/portal/ComoTrabajamos";
import TresColumnasInfo from "../../components/portal/TresColumnasInfo";
import Valores from "../../components/portal/Valores";
import Equipo from "../../components/portal/Equipo";
import Testimonios from "../../components/portal/Testimonios";
import VideoGaleria from "../../components/portal/VideoGaleria";
import Contacto from "../../components/portal/Contacto";
import "../../components/portal/portalTheme.css";
import { withTenantPath } from "../../utils/tenantRouting";
import { portalService } from "../../services/portalService";

const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:8080/api";
const PORTAL_BASE = `${API_BASE.replace(/\/+$/, "")}/v1/portal`;

const Home = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(null);
  const [page, setPage] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");

  const handleCitaParticular = (e) => {
    e.preventDefault();

    localStorage.setItem("intencionCita", "PARTICULAR");

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

  useEffect(() => {
    const root = document.documentElement;
    const t = theme || {};

    root.style.setProperty("--portal-primary", t.primary_color || "#2f7ecb");
    root.style.setProperty("--portal-secondary", t.secondary_color || "#0f172a");
    root.style.setProperty("--portal-accent", t.accent_color || "#34d399");
    root.style.setProperty("--portal-bg", t.background_color || "#ffffff");
    root.style.setProperty("--portal-surface", t.surface_color || "#efefef");
    root.style.setProperty("--portal-text", t.text_color || "#0f172a");
    root.style.setProperty("--portal-radius", `${t.border_radius ?? 12}px`);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [tRes, pRes, policyData] = await Promise.all([
          fetch(`${PORTAL_BASE}/theme/`, {
            cache: "no-store",
            headers: tenantSlug ? { "X-Tenant-Slug-Override": tenantSlug } : {},
          }),
          fetch(`${PORTAL_BASE}/pages/home/`, {
            cache: "no-store",
            headers: tenantSlug ? { "X-Tenant-Slug-Override": tenantSlug } : {},
          }),
          portalService.getPublicPolicy().catch(() => null),
        ]);

        const tData = tRes.ok ? await tRes.json() : null;
        const pData = pRes.ok ? await pRes.json() : null;

        if (!mounted) return;

        setTheme(tData);
        setPage(pData);
        setPolicy(policyData);

        if (!tRes.ok || !pRes.ok) {
          setError("No se pudo cargar la configuración del portal (theme/page).");
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Error cargando configuración del portal.");
        setTheme(null);
        setPage(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [tenantSlug]);

  const sections = useMemo(() => {
    const arr = page?.sections;
    return Array.isArray(arr) ? arr : [];
  }, [page]);

  const portalWebCompletoEnabled =
    policy?.features?.portal_web_completo?.enabled ?? true;

  const renderSection = (section) => {
    const type = section?.type;
    const data = section?.data || {};

    switch (type) {
      case "hero":
        return <HeroMedical data={data} />;
      case "features":
        return <FeaturesStrip data={data} />;
      case "services":
        return <ServiciosMedicos data={data} />;
      case "how_we_work":
        return <ComoTrabajamos data={data} />;
      case "three_cols":
        return <TresColumnasInfo data={data} />;
      case "values":
        return <Valores data={data} />;
      case "team":
        return <Equipo data={data} />;
      case "testimonials":
        return <Testimonios data={data} />;
      case "videos":
        return <VideoGaleria data={data} />;
      case "contact":
        return (
          <Contacto
            data={data}
            onAgendarCita={handleCitaParticular}
            onIrPQRS={
              portalWebCompletoEnabled
                ? () => navigate(withTenantPath(tenantSlug, "/pqrs"))
                : null
            }
          />
        );

      case "custom":
        if (section?.is_active === false) return null;
        return (
          <section className="bg-[var(--portal-surface)]">
            <div className="mx-auto max-w-6xl px-4 py-16">
              <h2 className="text-3xl font-extrabold text-[var(--portal-primary)]">
                {data?.title || "Sección personalizada"}
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                {data?.subtitle || "Contenido configurable desde el CMS."}
              </p>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  const renderStaticFallback = () => (
    <main>
      <HeroMedical />
      <FeaturesStrip />
      <ServiciosMedicos />
      <ComoTrabajamos />
      <TresColumnasInfo />
      <Valores />
      <Equipo />
      <Testimonios />
      <VideoGaleria />
      <Contacto
        onAgendarCita={handleCitaParticular}
        onIrPQRS={
          portalWebCompletoEnabled
            ? () => navigate(withTenantPath(tenantSlug, "/pqrs"))
            : null
        }
      />
    </main>
  );

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--portal-bg)",
        color: "var(--portal-text)",
      }}
    >
      <Navbar
        theme={theme}
        tenantSlug={tenantSlug}
        portalWebCompletoEnabled={portalWebCompletoEnabled}
        contactData={sections?.find(s => s.type==="contact")?.data}
        servicesData={sections?.find(s => s.type==="services")?.data}
      />

      {loading ? (
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="h-10 w-64 rounded bg-slate-100 animate-pulse" />
          <div className="mt-4 h-4 w-full max-w-xl rounded bg-slate-100 animate-pulse" />
          <div className="mt-2 h-4 w-full max-w-lg rounded bg-slate-100 animate-pulse" />
        </div>
      ) : sections.length > 0 ? (
        <main>
          {sections.map((s) => (
            <React.Fragment key={s.id}>{renderSection(s)}</React.Fragment>
          ))}
        </main>
      ) : (
        renderStaticFallback()
      )}

      {error && (
        <div className="mx-auto max-w-6xl px-4 pb-6">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <Footer
        theme={theme}
        tenantSlug={tenantSlug}
        portalWebCompletoEnabled={portalWebCompletoEnabled}
        contactData={sections?.find(s => s.type==="contact")?.data}
        servicesData={sections?.find(s => s.type==="services")?.data}
      />
    </div>
  );
};

export default Home;

