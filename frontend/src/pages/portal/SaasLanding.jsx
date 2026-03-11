import React from 'react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'FREE',
    price: '$0',
    note: 'Para consultorios pequenos',
    items: ['1 profesional', '200 pacientes', '1 sede', 'Agenda y dashboard basico'],
    cta: '/saas/signup',
  },
  {
    name: 'STARTER',
    price: '$1.5M COP/ano',
    note: 'Para IPS pequenas',
    items: ['Hasta 5 profesionales', '2000 pacientes', 'Agenda avanzada', 'Portal simple + email + SMS'],
    cta: '/saas/signup',
  },
  {
    name: 'PROFESSIONAL',
    price: '$9M COP/ano',
    note: 'Plan mas vendido',
    items: ['Capacidades ilimitadas', 'Portal completo + PQRS', 'Dashboard avanzado', 'API publica'],
    cta: '/saas/signup',
  },
  {
    name: 'ENTERPRISE',
    price: '$25M COP/ano',
    note: 'Clinicas grandes',
    items: ['IA predictiva', 'Chatbot', 'WhatsApp', 'Integraciones + soporte prioritario'],
    cta: '/saas/signup',
  },
];

export default function SaasLanding() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#dbeafe_0,#f8fafc_40%),radial-gradient(circle_at_100%_100%,#ccfbf1_0,#f8fafc_35%)] text-slate-900">
      <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="font-black text-xl tracking-tight">IDEFNOVA</div>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <a href="#planes" className="hover:text-blue-700">Planes</a>
          <a href="#modulos" className="hover:text-blue-700">Modulos</a>
          <Link to="/saas/signup" className="rounded-full bg-slate-900 text-white px-4 py-2 hover:opacity-90">
            Probar gratis
          </Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-8 pb-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="inline-flex rounded-full border border-slate-300/60 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              SaaS para clinicas
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl font-black leading-tight">
              Una sola plataforma para operar multiples clinicas con aislamiento seguro.
            </h1>
            <p className="mt-4 text-slate-600 text-lg">
              Agenda, pacientes, profesionales, portal web, notificaciones e IA en una arquitectura multi-tenant.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/saas/signup" className="rounded-full bg-blue-600 text-white px-6 py-3 font-bold hover:bg-blue-700">
                Crear clinica FREE
              </Link>
              <a href="#planes" className="rounded-full border border-slate-300 px-6 py-3 font-bold hover:bg-white">
                Ver planes
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur p-6 shadow-xl">
            <p className="text-sm font-bold text-slate-500">Arquitectura objetivo</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Gateway + tenant headers firmados</li>
              <li>Schema por tenant en microservicios core</li>
              <li>Planes + features en tenant-billing-ms</li>
              <li>Onboarding guiado para clinicas nuevas</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="planes" className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-black">Planes IDEFNOVA</h2>
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-black text-lg">{plan.name}</h3>
              <p className="text-blue-700 font-black mt-1">{plan.price}</p>
              <p className="text-xs text-slate-500 mt-1">{plan.note}</p>
              <ul className="mt-4 text-sm space-y-1">
                {plan.items.map((i) => (
                  <li key={i}>- {i}</li>
                ))}
              </ul>
              <Link to={plan.cta} className="mt-5 inline-block rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-bold">
                Empezar
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="modulos" className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-black">Modulos premium</h2>
        <div className="mt-5 grid md:grid-cols-4 gap-4 text-sm">
          <div className="rounded-xl bg-white p-4 border">WhatsApp citas: 2M/ano</div>
          <div className="rounded-xl bg-white p-4 border">IA prediccion: 3M/ano</div>
          <div className="rounded-xl bg-white p-4 border">Portal paciente: 1.5M/ano</div>
          <div className="rounded-xl bg-white p-4 border">Integraciones API: 3M/ano</div>
        </div>
      </section>
    </div>
  );
}

