import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaCheckCircle, FaCircle, FaPlay, FaArrowRight } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { getClinicOnboardingKeys } from '../../utils/clinicOnboarding';

const STEPS = [
    {
        id: 'parametricas_base',
        title: 'Configurar parametrica base',
        description: 'Define sedes, especialidades y catalogos base de operacion.',
        route: '/dashboard/admin/parametricas',
        whereToClick: 'Menu izquierdo > Configuracion > Parametricas',
    },
    {
        id: 'profesionales',
        title: 'Registrar profesionales',
        description: 'Crea el equipo medico con sus datos y estado.',
        route: '/dashboard/admin/profesionales',
        whereToClick: 'Menu izquierdo > Configuracion > Profesionales',
    },
    {
        id: 'agenda',
        title: 'Configurar agenda y reglas',
        description: 'Define horarios, disponibilidad y reglas de atencion.',
        route: '/dashboard/admin/agenda',
        whereToClick: 'Menu izquierdo > Configuracion > Agenda',
    },
    {
        id: 'usuarios',
        title: 'Ajustar roles de usuarios',
        description: 'Asigna permisos iniciales al equipo administrativo.',
        route: '/dashboard/admin/usuarios',
        whereToClick: 'Menu izquierdo > Configuracion > Gestion de Usuarios',
    },
    {
        id: 'branding_portal',
        title: 'Ajustar branding y portal',
        description: 'Configura imagen de la clinica y parametros globales.',
        route: '/dashboard/admin/configuracion',
        whereToClick: 'Menu izquierdo > Configuracion > Configuracion del Sistema',
    },
];

const ConfiguracionInicialClinica = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [checklist, setChecklist] = useState({});

    const keys = useMemo(() => getClinicOnboardingKeys(user), [user]);
    const completedCount = useMemo(
        () => STEPS.filter((step) => checklist[step.id]).length,
        [checklist]
    );
    const percent = Math.round((completedCount / STEPS.length) * 100);
    const isComplete = completedCount === STEPS.length;

    useEffect(() => {
        const saved = localStorage.getItem(keys.checklist);
        if (saved) {
            try {
                setChecklist(JSON.parse(saved));
                return;
            } catch (_err) {
            }
        }

        const initial = {};
        STEPS.forEach((s) => {
            initial[s.id] = false;
        });
        setChecklist(initial);
    }, [keys.checklist]);

    useEffect(() => {
        if (!checklist || Object.keys(checklist).length === 0) return;
        localStorage.setItem(keys.checklist, JSON.stringify(checklist));
    }, [checklist, keys.checklist]);

    useEffect(() => {
        if (searchParams.get('tour') !== '1') return;

        Swal.fire({
            title: 'Guia de configuracion inicial',
            html: `
                <div style="text-align:left">
                    <p style="margin-bottom:8px">Esta guia te muestra el orden recomendado para arrancar sin errores.</p>
                    <p style="margin-bottom:8px"><b>Como usarla:</b></p>
                    <ol style="margin-left:18px">
                        <li>Abre cada modulo desde el boton "Ir al modulo"</li>
                        <li>Aplica la configuracion requerida</li>
                        <li>Marca el paso como completado</li>
                    </ol>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Entendido',
        });
    }, [searchParams]);

    const toggleStep = (stepId) => {
        setChecklist((prev) => ({
            ...prev,
            [stepId]: !prev[stepId],
        }));
    };

    const openStep = (step) => {
        navigate(step.route);
    };

    const completeOnboarding = async () => {
        localStorage.setItem(keys.done, '1');
        localStorage.removeItem(keys.snoozeUntil);
        await Swal.fire({
            icon: 'success',
            title: 'Onboarding completado',
            text: 'La clinica ya quedo marcada como configurada.',
            timer: 1600,
            showConfirmButton: false,
        });
        navigate('/dashboard');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h1 className="text-2xl font-black text-gray-800">Configuracion inicial de la clinica</h1>
                <p className="text-sm text-gray-600 mt-2">
                    Sigue este checklist para dejar la clinica lista desde el primer ingreso.
                </p>

                <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
                        <span>Progreso</span>
                        <span>{completedCount}/{STEPS.length} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                            className="h-2.5 rounded-full bg-blue-600 transition-all"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                {STEPS.map((step, index) => (
                    <article key={step.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <button
                                    type="button"
                                    onClick={() => toggleStep(step.id)}
                                    className="mt-1 text-lg text-blue-600 hover:text-blue-800"
                                    title="Marcar como completado"
                                >
                                    {checklist[step.id] ? <FaCheckCircle /> : <FaCircle />}
                                </button>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                        Paso {index + 1}
                                    </p>
                                    <h2 className="text-lg font-black text-gray-800">{step.title}</h2>
                                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        <span className="font-bold">Donde hacer clic:</span> {step.whereToClick}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => openStep(step)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                            >
                                <FaPlay size={12} />
                                Ir al modulo
                            </button>
                        </div>
                    </article>
                ))}
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-wrap gap-3 justify-between items-center">
                <p className="text-sm text-gray-600">
                    {isComplete
                        ? 'Checklist completo. Ya puedes cerrar la configuracion inicial.'
                        : 'Completa todos los pasos para marcar la clinica como configurada.'}
                </p>
                <button
                    type="button"
                    onClick={completeOnboarding}
                    disabled={!isComplete}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        isComplete
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    Finalizar onboarding
                    <FaArrowRight size={12} />
                </button>
            </section>
        </div>
    );
};

export default ConfiguracionInicialClinica;

