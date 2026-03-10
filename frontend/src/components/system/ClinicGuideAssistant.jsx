import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FaCheckCircle,
    FaCircle,
    FaCloud,
    FaTimes,
    FaRoute,
    FaClock,
    FaProjectDiagram,
    FaQuestionCircle,
    FaGraduationCap,
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { getClinicOnboardingKeys } from '../../utils/clinicOnboarding';
import { getActiveTenantId } from '../../utils/tenantContext';
import { authService } from '../../services/authService';

const GUIDE_OPEN_EVENT = 'clinic-guide:open';

const CORE_STEPS = [
    {
        id: 'parametricas_base',
        title: 'Configurar Parametricas',
        description: 'Define sedes, especialidades y catalogos base para arrancar.',
        route: '/dashboard/admin/parametricas',
    },
    {
        id: 'roles_permisos',
        title: 'Configurar Roles y Permisos',
        description: 'Crea roles (ej. Recepcion) y asigna modulos del menu por rol.',
        route: '/dashboard/admin/configuracion?tab=menus',
    },
    {
        id: 'usuarios_roles',
        title: 'Crear Usuarios y Asignar Roles',
        description: 'Crea el equipo y asigna el rol correcto a cada perfil.',
        route: '/dashboard/admin/usuarios',
    },
    {
        id: 'profesionales',
        title: 'Registrar Profesionales',
        description: 'Carga medicos/profesionales para habilitar agenda y atencion.',
        route: '/dashboard/admin/profesionales',
    },
    {
        id: 'agenda',
        title: 'Configurar Agenda',
        description: 'Define disponibilidad, reglas y flujo operativo de citas.',
        route: '/dashboard/admin/agenda',
    },
    {
        id: 'branding',
        title: 'Ajustar Branding',
        description: 'Personaliza nombre, logo y apariencia de la plataforma.',
        route: '/dashboard/admin/configuracion?tab=branding',
    },
];

const MODULE_HELP_MAP = {
    '/dashboard/admin/pacientes': {
        purpose: 'Gestiona fichas de pacientes y su informacion clinica base.',
        useCase: 'Actualizar datos clinicos y administrativos del paciente.',
    },
    '/dashboard/admin/validar-usuarios': {
        purpose: 'Valida solicitudes y perfiles pendientes (ej. afiliados).',
        useCase: 'Aprobar o rechazar procesos de validacion inicial.',
    },
    '/dashboard/doctor/atencion': {
        purpose: 'Modulo de atencion en consultorio para el profesional.',
        useCase: 'Llamar paciente, registrar evolucion y cerrar atencion.',
    },
    '/dashboard/admin/recepcion': {
        purpose: 'Control de llegada y flujo de sala de espera.',
        useCase: 'Marcar ingreso en sala y coordinar turnos de consulta.',
    },
    '/dashboard/admin/citas': {
        purpose: 'Operacion de gestion de citas administrativas.',
        useCase: 'Revisar, ajustar y gestionar estados de citas.',
    },
    '/dashboard/admin/agenda': {
        purpose: 'Motor de agenda por profesional y reglas horarias.',
        useCase: 'Configurar disponibilidad y bloques de atencion.',
    },
    '/dashboard/admin/usuarios': {
        purpose: 'Gestion de usuarios del tenant y sus roles.',
        useCase: 'Crear cuentas internas y asignar permisos por rol.',
    },
    '/dashboard/admin/configuracion': {
        purpose: 'Reglas globales, menus/permisos y branding del tenant.',
        useCase: 'Ajustar comportamiento del sistema y experiencia visual.',
    },
};

const DEFAULT_PROCESS_NODES = [
    { key: 'roles', name: 'Roles y Permisos', route: '/dashboard/admin/configuracion?tab=menus' },
    { key: 'usuarios', name: 'Usuarios', route: '/dashboard/admin/usuarios' },
    { key: 'pacientes', name: 'Pacientes', route: '/dashboard/admin/pacientes' },
    { key: 'agenda', name: 'Agenda', route: '/dashboard/admin/agenda' },
    { key: 'citas', name: 'Gestion de Citas', route: '/dashboard/admin/citas' },
    { key: 'recepcion', name: 'Recepcion', route: '/dashboard/admin/recepcion' },
    { key: 'atencion', name: 'Atencion Consultorio', route: '/dashboard/doctor/atencion' },
];

const CloudHint = ({ style, text, visible }) => {
    if (!visible) return null;
    return (
        <div className="fixed z-[80] max-w-xs" style={style}>
            <div className="relative rounded-2xl bg-white/85 border border-blue-100 shadow-2xl px-4 py-3 backdrop-blur-sm">
                <div className="absolute -left-2 top-5 w-4 h-4 rotate-45 bg-white border-l border-b border-blue-100" />
                <p className="text-xs font-bold text-blue-700 mb-1">Guia</p>
                <p className="text-xs text-gray-700 leading-5">{text}</p>
            </div>
        </div>
    );
};

const normalizeCategory = (value) =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

const normalizeRoutePath = (route) => String(route || '').split('?')[0];

const buildQuickAnswer = (question, modules) => {
    const q = String(question || '').toLowerCase();
    if (!q.trim()) return 'Escribe una pregunta sobre modulos, roles o flujo de citas.';

    if (q.includes('rol') || q.includes('permiso')) {
        return 'Primero crea el rol en Configuracion > Menus y Permisos, luego asigna modulos y despues asigna ese rol a cada usuario en Gestion de Usuarios.';
    }

    if (q.includes('paciente')) {
        return 'Usa el modulo Pacientes para datos clinicos y Validar Usuarios para aprobaciones iniciales.';
    }

    const match = modules.find((m) => q.includes(String(m.label || '').toLowerCase()));
    if (match) {
        return `${match.label}: ${match.purpose}`;
    }

    return 'No encontre coincidencia exacta. Abre la pestaña "Aprender modulos" y selecciona el modulo para ver su explicacion y uso recomendado.';
};

const ClinicGuideAssistant = () => {
    const { user, permissions } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [showTeaser, setShowTeaser] = useState(false);
    const [hintPos, setHintPos] = useState(null);
    const [hintVisible, setHintVisible] = useState(false);
    const [checklist, setChecklist] = useState({});
    const [activeView, setActiveView] = useState('onboarding');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [guideContentMap, setGuideContentMap] = useState({});

    const panelRef = useRef(null);
    const fabRef = useRef(null);

    const isAdmin = Boolean(
        user?.is_staff ||
        user?.is_superuser ||
        (permissions?.roles || []).includes('Administrador')
    );

    const keys = useMemo(() => getClinicOnboardingKeys(user), [user]);
    const isDone = localStorage.getItem(keys.done) === '1';
    const tenantCacheKey = getActiveTenantId() || user?.tenant_id || 'default';
    const menuStorageKey = `menuItems_${tenantCacheKey}`;

    const menuItems = useMemo(() => {
        try {
            const raw = localStorage.getItem(menuStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_err) {
            return [];
        }
    }, [menuStorageKey, location.pathname]);

    useEffect(() => {
        const loadGuideContent = async () => {
            try {
                const data = await authService.getGuideContent();
                const list = Array.isArray(data) ? data : (data?.results || []);
                const map = {};
                list.forEach((item) => {
                    if (item?.key) map[item.key] = item.content || {};
                });
                setGuideContentMap(map);
            } catch (_err) {
                // fallback a contenido por defecto
            }
        };
        loadGuideContent();
    }, []);

    const menuMap = useMemo(() => {
        const map = {};
        menuItems.forEach((item) => {
            if (item?.url) map[item.url] = item;
        });
        return map;
    }, [menuItems]);

    const configuredCoreSteps = useMemo(() => {
        const cfg = guideContentMap.onboarding_steps;
        const steps = cfg?.steps;
        if (!Array.isArray(steps) || steps.length === 0) return CORE_STEPS;
        return steps
            .filter((s) => s?.id && s?.title && s?.route)
            .map((s) => ({
                id: String(s.id),
                title: String(s.title),
                description: String(s.description || ''),
                route: String(s.route),
            }));
    }, [guideContentMap]);

    const stepsWithGuide = useMemo(
        () =>
            configuredCoreSteps.map((step) => {
                const basePath = normalizeRoutePath(step.route);
                const menuItem = menuMap[basePath];
                const categoryName = menuItem?.category_name || 'Configuracion';
                const itemLabel = menuItem?.label || step.title;
                return {
                    ...step,
                    routePath: basePath,
                    categoryKey: normalizeCategory(categoryName),
                    whereToClick: `Menu izquierdo > ${categoryName} > ${itemLabel}`,
                };
            }),
        [menuMap, configuredCoreSteps]
    );

    const learningModules = useMemo(() => {
        const seen = new Set();
        return menuItems
            .filter((m) => !!m?.url && !!m?.label)
            .filter((m) => {
                if (seen.has(m.url)) return false;
                seen.add(m.url);
                return true;
            })
            .map((m) => {
                const customHelp = guideContentMap.module_help?.routes?.[m.url] || {};
                const help = { ...(MODULE_HELP_MAP[m.url] || {}), ...customHelp };
                const normalizedHelp = Object.keys(help).length ? help : {
                    purpose: `Modulo operativo de ${m.label}.`,
                    useCase: 'Usalo para ejecutar el proceso de negocio asociado a este modulo.',
                };
                return {
                    id: m.id || m.url,
                    url: m.url,
                    label: m.label,
                    category: m.category_name || 'General',
                    purpose: normalizedHelp.purpose,
                    useCase: normalizedHelp.useCase,
                };
            });
    }, [menuItems, guideContentMap]);

    const processMap = useMemo(() => {
        const cfgNodes = guideContentMap.process_map?.nodes;
        const nodes = Array.isArray(cfgNodes) && cfgNodes.length ? cfgNodes : DEFAULT_PROCESS_NODES;

        return nodes.map((n) => {
            const path = normalizeRoutePath(n.route);
            const exists = !!menuMap[path];
            return { ...n, enabled: exists };
        });
    }, [menuMap, guideContentMap]);

    const completedCount = useMemo(
        () => stepsWithGuide.filter((s) => checklist[s.id]).length,
        [checklist, stepsWithGuide]
    );
    const isComplete = completedCount === stepsWithGuide.length;
    const activeStep = useMemo(
        () => stepsWithGuide.find((s) => !checklist[s.id]) || stepsWithGuide[stepsWithGuide.length - 1],
        [checklist, stepsWithGuide]
    );

    const currentRouteStep = useMemo(
        () => stepsWithGuide.find((s) => location.pathname === s.routePath) || null,
        [location.pathname, stepsWithGuide]
    );

    useEffect(() => {
        if (!isAdmin || !user) return;
        const saved = localStorage.getItem(keys.checklist);
        if (saved) {
            try {
                setChecklist(JSON.parse(saved));
                return;
            } catch (_err) {
                // ignore malformed local content
            }
        }
        const seed = {};
        stepsWithGuide.forEach((s) => {
            seed[s.id] = false;
        });
        setChecklist(seed);
    }, [isAdmin, user, keys.checklist, stepsWithGuide]);

    useEffect(() => {
        if (!isAdmin || !user || Object.keys(checklist).length === 0) return;
        localStorage.setItem(keys.checklist, JSON.stringify(checklist));
    }, [isAdmin, user, checklist, keys.checklist]);

    useEffect(() => {
        if (!isAdmin || !user || isDone) return;
        if (sessionStorage.getItem(keys.seenSession) === '1') return;

        const snoozeUntil = Number(localStorage.getItem(keys.snoozeUntil) || 0);
        if (snoozeUntil && Date.now() < snoozeUntil) return;

        sessionStorage.setItem(keys.seenSession, '1');
        setIsOpen(true);
        setIsMinimized(true);
        setShowTeaser(true);
        setTimeout(() => setShowTeaser(false), 6000);
    }, [isAdmin, user, isDone, keys.seenSession, keys.snoozeUntil]);

    useEffect(() => {
        if (!isAdmin || !user) return;
        const fromStorage = localStorage.getItem(keys.assistantOpen) === '1';
        if (!fromStorage) return;
        setIsOpen(true);
        setIsMinimized(true);
        setShowTeaser(true);
        setTimeout(() => setShowTeaser(false), 6000);
        localStorage.removeItem(keys.assistantOpen);
    }, [isAdmin, user, keys.assistantOpen]);

    useEffect(() => {
        const handler = () => {
            setIsOpen(true);
            setIsMinimized(true);
            setShowTeaser(true);
            setTimeout(() => setShowTeaser(false), 6000);
        };
        window.addEventListener(GUIDE_OPEN_EVENT, handler);
        return () => window.removeEventListener(GUIDE_OPEN_EVENT, handler);
    }, []);

    useEffect(() => {
        if (!isOpen || isMinimized) return;

        const handlePointerDown = (event) => {
            const panelNode = panelRef.current;
            const fabNode = fabRef.current;
            const target = event.target;
            if (!panelNode || !target) return;

            const clickedInsidePanel = panelNode.contains(target);
            const clickedFab = fabNode ? fabNode.contains(target) : false;
            if (!clickedInsidePanel && !clickedFab) {
                setIsMinimized(true);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [isOpen, isMinimized]);

    useEffect(() => {
        if (!isOpen || isMinimized || activeView !== 'onboarding' || !activeStep) {
            setHintPos(null);
            return;
        }

        const paintHint = () => {
            const routeSelector = `a[data-guide-route="${activeStep.routePath}"]`;
            const routeNode = document.querySelector(routeSelector);
            const categorySelector = `button[data-guide-category="${activeStep.categoryKey}"]`;
            const categoryNode = document.querySelector(categorySelector);
            const target = routeNode || categoryNode;
            if (!target) {
                setHintPos(null);
                return;
            }

            const rect = target.getBoundingClientRect();
            setHintPos({
                top: Math.max(80, rect.top - 8),
                left: rect.right + 12,
            });
            setHintVisible(true);
            setTimeout(() => setHintVisible(false), 4200);
        };

        paintHint();
        window.addEventListener('resize', paintHint);
        window.addEventListener('scroll', paintHint, true);
        return () => {
            window.removeEventListener('resize', paintHint);
            window.removeEventListener('scroll', paintHint, true);
        };
    }, [isOpen, isMinimized, activeView, activeStep, location.pathname]);

    if (!isAdmin) return null;

    const toggleStep = (stepId) => {
        setChecklist((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
    };

    const markStepCompleted = (stepId) => {
        setChecklist((prev) => ({ ...prev, [stepId]: true }));
    };

    const openStep = (step) => {
        navigate(step.route);
    };

    const snoozeOneDay = () => {
        const dayMs = 24 * 60 * 60 * 1000;
        localStorage.setItem(keys.snoozeUntil, String(Date.now() + dayMs));
        setIsOpen(false);
    };

    const completeGuide = () => {
        localStorage.setItem(keys.done, '1');
        localStorage.removeItem(keys.snoozeUntil);
        setIsMinimized(true);
    };

    const restartGuide = () => {
        const seed = {};
        stepsWithGuide.forEach((s) => {
            seed[s.id] = false;
        });
        setChecklist(seed);
        localStorage.removeItem(keys.done);
        localStorage.removeItem(keys.snoozeUntil);
        setIsOpen(true);
        setIsMinimized(false);
        setActiveView('onboarding');
    };

    const askQuestion = () => {
        const resp = buildQuickAnswer(question, learningModules);
        setAnswer(resp);
    };

    return (
        <>
            <CloudHint
                visible={isOpen && !isMinimized && hintVisible && !!hintPos}
                style={hintPos || undefined}
                text={activeStep ? `Haz clic aqui: ${activeStep.whereToClick}` : ''}
            />

            <button
                ref={fabRef}
                type="button"
                onClick={() => {
                    if (!isOpen) {
                        setIsOpen(true);
                        setIsMinimized(false);
                        return;
                    }
                    setIsMinimized((v) => !v);
                }}
                className="fixed top-24 right-6 z-[79] rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-2xl px-4 py-3 font-black text-xs flex items-center gap-2 hover:scale-105 transition-transform"
                title="Guia y ayuda de la aplicacion"
            >
                <FaCloud />
                {isMinimized ? 'Guia y ayuda' : 'Centro de aprendizaje'}
            </button>

            {isOpen && isMinimized && showTeaser && (
                <div className="fixed top-36 right-6 z-[79] rounded-2xl bg-white/90 border border-cyan-100 px-4 py-2 shadow-xl backdrop-blur-sm">
                    <p className="text-xs font-bold text-cyan-700">Estoy aqui para ayudarte</p>
                    <p className="text-[11px] text-gray-600">Puedes abrir la guia cuando quieras.</p>
                </div>
            )}

            {isOpen && !isMinimized && (
                <aside ref={panelRef} className="fixed top-28 bottom-6 right-6 z-[79] w-[390px] overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl flex flex-col">
                    <div className="px-5 py-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-blue-100 flex justify-between items-start">
                        <div>
                            <p className="text-[11px] uppercase tracking-widest font-black text-blue-500">Asistente</p>
                            <h3 className="text-lg font-black text-gray-800">Configuracion y aprendizaje</h3>
                            <p className="text-xs text-gray-600 mt-1">{completedCount}/{stepsWithGuide.length} pasos completados</p>
                            {currentRouteStep && !checklist[currentRouteStep.id] && (
                                <button
                                    type="button"
                                    onClick={() => markStepCompleted(currentRouteStep.id)}
                                    className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                                >
                                    Marcar modulo actual
                                </button>
                            )}
                        </div>
                        <button type="button" onClick={() => setIsMinimized(true)} className="text-gray-400 hover:text-gray-700">
                            <FaTimes />
                        </button>
                    </div>

                    <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setActiveView('onboarding')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeView === 'onboarding' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}><FaCloud className="inline mr-1" />Onboarding</button>
                        <button type="button" onClick={() => setActiveView('aprendizaje')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeView === 'aprendizaje' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}><FaGraduationCap className="inline mr-1" />Aprender modulos</button>
                        <button type="button" onClick={() => setActiveView('mapa')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeView === 'mapa' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}><FaProjectDiagram className="inline mr-1" />Mapa de proceso</button>
                        <button type="button" onClick={() => setActiveView('preguntas')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeView === 'preguntas' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}><FaQuestionCircle className="inline mr-1" />Preguntas</button>
                    </div>

                    <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
                        {activeView === 'onboarding' && stepsWithGuide.map((step) => (
                            <div key={step.id} className="border border-gray-100 rounded-2xl p-3">
                                <div className="flex items-start gap-2">
                                    <button type="button" onClick={() => toggleStep(step.id)} className="text-blue-600 mt-0.5">
                                        {checklist[step.id] ? <FaCheckCircle /> : <FaCircle />}
                                    </button>
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-gray-800">{step.title}</p>
                                        <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                                        <p className="text-[11px] text-blue-700 mt-1 font-bold">{step.whereToClick}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => openStep(step)} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                                    <FaRoute size={11} />
                                    Ir al modulo
                                </button>
                                <button type="button" onClick={() => toggleStep(step.id)} className={`mt-3 ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${checklist[step.id] ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    {checklist[step.id] ? 'Paso completado' : 'Marcar completado'}
                                </button>
                            </div>
                        ))}

                        {activeView === 'aprendizaje' && learningModules.map((m) => (
                            <div key={m.id} className="border border-gray-100 rounded-2xl p-3">
                                <p className="text-[10px] uppercase tracking-wider font-black text-gray-400">{m.category}</p>
                                <p className="text-sm font-black text-gray-800">{m.label}</p>
                                <p className="text-xs text-gray-600 mt-1">{m.purpose}</p>
                                <p className="text-[11px] text-indigo-700 mt-1"><b>Uso recomendado:</b> {m.useCase}</p>
                                <button type="button" onClick={() => navigate(m.url)} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">
                                    <FaRoute size={11} /> Abrir modulo
                                </button>
                            </div>
                        ))}

                        {activeView === 'mapa' && (
                            <div className="space-y-2">
                                {processMap.map((node, idx) => (
                                    <div key={node.key} className={`rounded-xl border p-3 ${node.enabled ? 'border-cyan-200 bg-cyan-50/40' : 'border-gray-200 bg-gray-50'}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-gray-800">{idx + 1}. {node.name}</p>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${node.enabled ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-200 text-gray-500'}`}>
                                                {node.enabled ? 'Disponible' : 'No activo en este plan'}
                                            </span>
                                        </div>
                                        <button type="button" disabled={!node.enabled} onClick={() => node.enabled && navigate(node.route)} className={`mt-2 text-xs font-bold ${node.enabled ? 'text-cyan-700 hover:text-cyan-900' : 'text-gray-400 cursor-not-allowed'}`}>
                                            Ir a este paso
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeView === 'preguntas' && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-600">Pregunta sobre uso de modulos, roles o flujo operativo.</p>
                                <textarea
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Ej: para que sirve Gestion de Citas?"
                                />
                                <button type="button" onClick={askQuestion} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                                    Responder
                                </button>
                                <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/40 min-h-16">
                                    <p className="text-xs text-gray-700 leading-5">{answer || 'Aqui veras respuestas rapidas basadas en los modulos activos del tenant.'}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button type="button" onClick={snoozeOneDay} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200">
                            <FaClock size={11} />
                            Recordar manana
                        </button>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={restartGuide} className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">
                                Reiniciar guia
                            </button>
                            <button type="button" disabled={!isComplete} onClick={completeGuide} className={`px-3 py-2 rounded-xl text-xs font-bold ${isComplete ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
                                Finalizar guia
                            </button>
                        </div>
                    </div>
                </aside>
            )}
        </>
    );
};

export default ClinicGuideAssistant;
export { GUIDE_OPEN_EVENT };
