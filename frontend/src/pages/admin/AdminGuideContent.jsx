import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
    FaQuestionCircle,
    FaSave,
    FaSyncAlt,
    FaPlus,
    FaTrash,
    FaProjectDiagram,
    FaGraduationCap,
    FaCloud,
} from 'react-icons/fa';
import { authService } from '../../services/authService';

const normalizeList = (data) => (Array.isArray(data) ? data : data?.results || []);

const DEFAULT_ITEMS = [
    { key: 'onboarding_steps', title: 'Onboarding Steps', content: { steps: [] }, is_active: true },
    { key: 'module_help', title: 'Module Help', content: { routes: {} }, is_active: true },
    { key: 'process_map', title: 'Process Map', content: { nodes: [] }, is_active: true },
];

const DEFAULT_ONBOARDING_STEPS = [
    {
        id: 'parametricas_base',
        title: 'Configurar Parametricas',
        description: 'Define sedes, especialidades y catalogos base para arrancar.',
        route: '/dashboard/admin/parametricas',
    },
    {
        id: 'roles_permisos',
        title: 'Configurar Roles y Permisos',
        description: 'Crea roles por area y asigna modulos del menu por rol.',
        route: '/dashboard/admin/configuracion?tab=menus',
    },
    {
        id: 'usuarios_roles',
        title: 'Crear Usuarios y Asignar Roles',
        description: 'Crea el equipo y asigna permisos segun funcion.',
        route: '/dashboard/admin/usuarios',
    },
    {
        id: 'agenda',
        title: 'Configurar Agenda',
        description: 'Define disponibilidad, reglas y flujo de citas.',
        route: '/dashboard/admin/agenda',
    },
];

const DEFAULT_MODULE_HELP = {
    '/dashboard/admin/pacientes': {
        purpose: 'Gestion central de pacientes y datos clinicos base.',
        useCase: 'Actualizar informacion, trazabilidad y seguimiento administrativo.',
    },
    '/dashboard/admin/citas': {
        purpose: 'Operacion diaria de citas de la clinica.',
        useCase: 'Confirmar, reagendar, cancelar y monitorear estados de agenda.',
    },
    '/dashboard/admin/recepcion': {
        purpose: 'Control de llegada y flujo de sala de espera.',
        useCase: 'Registrar ingreso del paciente y coordinar paso a consultorio.',
    },
};

const DEFAULT_PROCESS_MAP = [
    { key: 'roles', name: 'Roles y Permisos', route: '/dashboard/admin/configuracion?tab=menus' },
    { key: 'usuarios', name: 'Usuarios', route: '/dashboard/admin/usuarios' },
    { key: 'pacientes', name: 'Pacientes', route: '/dashboard/admin/pacientes' },
    { key: 'agenda', name: 'Agenda', route: '/dashboard/admin/agenda' },
    { key: 'citas', name: 'Gestion de Citas', route: '/dashboard/admin/citas' },
];

const prettyJson = (value) => {
    try {
        return JSON.stringify(value ?? {}, null, 2);
    } catch (_err) {
        return '{}';
    }
};

const parseSafe = (raw, fallback) => {
    try {
        return JSON.parse(raw);
    } catch (_err) {
        return fallback;
    }
};

export default function AdminGuideContent() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState([]);

    const [onboardingSteps, setOnboardingSteps] = useState(DEFAULT_ONBOARDING_STEPS);
    const [moduleRows, setModuleRows] = useState([]);
    const [processNodes, setProcessNodes] = useState(DEFAULT_PROCESS_MAP);

    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [jsonDraft, setJsonDraft] = useState({});

    const mergedItems = useMemo(() => {
        const byKey = {};
        DEFAULT_ITEMS.forEach((d) => {
            byKey[d.key] = d;
        });
        items.forEach((x) => {
            byKey[x.key] = x;
        });
        return Object.values(byKey);
    }, [items]);

    const itemByKey = useMemo(() => {
        const map = {};
        mergedItems.forEach((item) => {
            map[item.key] = item;
        });
        return map;
    }, [mergedItems]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await authService.getGuideContentAdmin();
            const list = normalizeList(data);
            setItems(list);

            const draft = {};
            list.forEach((x) => {
                draft[x.key] = prettyJson(x.content);
            });
            setJsonDraft(draft);

            const onboardingItem = list.find((x) => x.key === 'onboarding_steps');
            const moduleItem = list.find((x) => x.key === 'module_help');
            const processItem = list.find((x) => x.key === 'process_map');

            const loadedSteps = onboardingItem?.content?.steps;
            setOnboardingSteps(Array.isArray(loadedSteps) && loadedSteps.length ? loadedSteps : DEFAULT_ONBOARDING_STEPS);

            const loadedRoutes = moduleItem?.content?.routes;
            const routesObj = loadedRoutes && typeof loadedRoutes === 'object' ? loadedRoutes : DEFAULT_MODULE_HELP;
            const rows = Object.entries(routesObj).map(([route, value]) => ({
                route,
                purpose: value?.purpose || '',
                useCase: value?.useCase || '',
            }));
            setModuleRows(rows.length ? rows : Object.entries(DEFAULT_MODULE_HELP).map(([route, value]) => ({ route, ...value })));

            const loadedNodes = processItem?.content?.nodes;
            setProcessNodes(Array.isArray(loadedNodes) && loadedNodes.length ? loadedNodes : DEFAULT_PROCESS_MAP);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar contenido de guia.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const ensureRecord = async (item) => {
        const existing = items.find((x) => x.key === item.key);
        if (existing) return existing;
        const created = await authService.createGuideContent({
            key: item.key,
            title: item.title,
            content: item.content || {},
            is_active: true,
        });
        setItems((prev) => [...prev, created]);
        return created;
    };

    const saveByKey = async (key, contentBuilder) => {
        const item = itemByKey[key];
        if (!item) return;
        try {
            setSaving(true);
            const record = await ensureRecord(item);
            const payload = {
                title: item.title,
                is_active: record.is_active ?? true,
                content: contentBuilder(),
            };
            const updated = await authService.updateGuideContent(record.id, payload);
            setItems((prev) => prev.map((x) => (x.key === updated.key ? updated : x)));
            setJsonDraft((prev) => ({ ...prev, [key]: prettyJson(updated.content) }));
            Swal.fire({ icon: 'success', title: `Guardado: ${key}`, timer: 1200, showConfirmButton: false });
        } catch (error) {
            console.error(error);
            Swal.fire('Error', `No se pudo guardar ${key}.`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (item) => {
        try {
            setSaving(true);
            const record = await ensureRecord(item);
            const updated = await authService.updateGuideContent(record.id, { is_active: !record.is_active });
            setItems((prev) => prev.map((x) => (x.key === updated.key ? updated : x)));
        } catch (error) {
            console.error(error);
            Swal.fire('Error', `No se pudo actualizar estado de ${item.key}.`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const saveAdvancedJson = async (key) => {
        const item = itemByKey[key];
        if (!item) return;
        const parsed = parseSafe(jsonDraft[key] || '{}', null);
        if (!parsed) {
            Swal.fire('JSON invalido', `El bloque ${key} no tiene formato JSON valido.`, 'warning');
            return;
        }
        await saveByKey(key, () => parsed);
        await loadData();
    };

    const getActiveClass = (key) => {
        const record = items.find((x) => x.key === key);
        return record?.is_active ?? true;
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <FaQuestionCircle className="text-indigo-600" />
                    Guia y Ayuda SaaS (Content Studio)
                </h1>
                <button
                    onClick={loadData}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-sm inline-flex items-center gap-2"
                >
                    <FaSyncAlt /> Refrescar
                </button>
            </div>

            {loading ? (
                <div className="bg-white rounded-xl border p-6 text-slate-500">Cargando contenido...</div>
            ) : (
                <div className="space-y-5">
                    <section className="bg-white border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-800 flex items-center gap-2"><FaCloud className="text-cyan-600" /> Onboarding</h2>
                                <p className="text-xs text-slate-500">Pasos guiados de configuracion inicial.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={saving}
                                    onClick={() => toggleActive(itemByKey.onboarding_steps)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${getActiveClass('onboarding_steps') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                                >
                                    {getActiveClass('onboarding_steps') ? 'Activo' : 'Inactivo'}
                                </button>
                                <button
                                    disabled={saving}
                                    onClick={() => saveByKey('onboarding_steps', () => ({ steps: onboardingSteps }))}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white inline-flex items-center gap-2"
                                >
                                    <FaSave /> Guardar
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 space-y-3">
                            {onboardingSteps.map((step, idx) => (
                                <div key={`${step.id || 'step'}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded-xl p-3 bg-slate-50">
                                    <input className="md:col-span-2 border rounded-lg p-2 text-sm" placeholder="id" value={step.id || ''} onChange={(e) => setOnboardingSteps((prev) => prev.map((s, i) => i === idx ? { ...s, id: e.target.value } : s))} />
                                    <input className="md:col-span-3 border rounded-lg p-2 text-sm" placeholder="Titulo" value={step.title || ''} onChange={(e) => setOnboardingSteps((prev) => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))} />
                                    <input className="md:col-span-4 border rounded-lg p-2 text-sm" placeholder="Descripcion" value={step.description || ''} onChange={(e) => setOnboardingSteps((prev) => prev.map((s, i) => i === idx ? { ...s, description: e.target.value } : s))} />
                                    <input className="md:col-span-2 border rounded-lg p-2 text-sm" placeholder="/ruta/modulo" value={step.route || ''} onChange={(e) => setOnboardingSteps((prev) => prev.map((s, i) => i === idx ? { ...s, route: e.target.value } : s))} />
                                    <button className="md:col-span-1 border rounded-lg p-2 text-sm text-rose-600 hover:bg-rose-50" onClick={() => setOnboardingSteps((prev) => prev.filter((_, i) => i !== idx))}>
                                        <FaTrash />
                                    </button>
                                </div>
                            ))}
                            <button className="px-3 py-2 rounded-lg bg-cyan-100 text-cyan-800 text-xs font-bold inline-flex items-center gap-2" onClick={() => setOnboardingSteps((prev) => [...prev, { id: '', title: '', description: '', route: '' }])}>
                                <FaPlus /> Agregar paso
                            </button>
                        </div>
                    </section>

                    <section className="bg-white border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-800 flex items-center gap-2"><FaGraduationCap className="text-indigo-600" /> Aprender Modulos</h2>
                                <p className="text-xs text-slate-500">Explicaciones por ruta: proposito y caso practico.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={saving}
                                    onClick={() => toggleActive(itemByKey.module_help)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${getActiveClass('module_help') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                                >
                                    {getActiveClass('module_help') ? 'Activo' : 'Inactivo'}
                                </button>
                                <button
                                    disabled={saving}
                                    onClick={() => {
                                        const routes = {};
                                        moduleRows.forEach((r) => {
                                            if (!r.route) return;
                                            routes[r.route] = { purpose: r.purpose || '', useCase: r.useCase || '' };
                                        });
                                        saveByKey('module_help', () => ({ routes }));
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white inline-flex items-center gap-2"
                                >
                                    <FaSave /> Guardar
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 space-y-3">
                            {moduleRows.map((row, idx) => (
                                <div key={`${row.route || 'route'}-${idx}`} className="border rounded-xl p-3 bg-slate-50">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                        <input className="md:col-span-4 border rounded-lg p-2 text-sm" placeholder="/dashboard/admin/modulo" value={row.route || ''} onChange={(e) => setModuleRows((prev) => prev.map((r, i) => i === idx ? { ...r, route: e.target.value } : r))} />
                                        <input className="md:col-span-4 border rounded-lg p-2 text-sm" placeholder="Proposito" value={row.purpose || ''} onChange={(e) => setModuleRows((prev) => prev.map((r, i) => i === idx ? { ...r, purpose: e.target.value } : r))} />
                                        <input className="md:col-span-3 border rounded-lg p-2 text-sm" placeholder="Caso de uso" value={row.useCase || ''} onChange={(e) => setModuleRows((prev) => prev.map((r, i) => i === idx ? { ...r, useCase: e.target.value } : r))} />
                                        <button className="md:col-span-1 border rounded-lg p-2 text-sm text-rose-600 hover:bg-rose-50" onClick={() => setModuleRows((prev) => prev.filter((_, i) => i !== idx))}>
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button className="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold inline-flex items-center gap-2" onClick={() => setModuleRows((prev) => [...prev, { route: '', purpose: '', useCase: '' }])}>
                                <FaPlus /> Agregar modulo
                            </button>
                        </div>
                    </section>

                    <section className="bg-white border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-800 flex items-center gap-2"><FaProjectDiagram className="text-emerald-600" /> Mapa de Proceso</h2>
                                <p className="text-xs text-slate-500">Secuencia operativa recomendada para la clinica.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={saving}
                                    onClick={() => toggleActive(itemByKey.process_map)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${getActiveClass('process_map') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                                >
                                    {getActiveClass('process_map') ? 'Activo' : 'Inactivo'}
                                </button>
                                <button
                                    disabled={saving}
                                    onClick={() => saveByKey('process_map', () => ({ nodes: processNodes }))}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white inline-flex items-center gap-2"
                                >
                                    <FaSave /> Guardar
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 space-y-3">
                            {processNodes.map((node, idx) => (
                                <div key={`${node.key || 'node'}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded-xl p-3 bg-slate-50">
                                    <input className="md:col-span-3 border rounded-lg p-2 text-sm" placeholder="key" value={node.key || ''} onChange={(e) => setProcessNodes((prev) => prev.map((n, i) => i === idx ? { ...n, key: e.target.value } : n))} />
                                    <input className="md:col-span-4 border rounded-lg p-2 text-sm" placeholder="Nombre" value={node.name || ''} onChange={(e) => setProcessNodes((prev) => prev.map((n, i) => i === idx ? { ...n, name: e.target.value } : n))} />
                                    <input className="md:col-span-4 border rounded-lg p-2 text-sm" placeholder="/ruta/modulo" value={node.route || ''} onChange={(e) => setProcessNodes((prev) => prev.map((n, i) => i === idx ? { ...n, route: e.target.value } : n))} />
                                    <button className="md:col-span-1 border rounded-lg p-2 text-sm text-rose-600 hover:bg-rose-50" onClick={() => setProcessNodes((prev) => prev.filter((_, i) => i !== idx))}>
                                        <FaTrash />
                                    </button>
                                </div>
                            ))}
                            <button className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-2" onClick={() => setProcessNodes((prev) => [...prev, { key: '', name: '', route: '' }])}>
                                <FaPlus /> Agregar nodo
                            </button>
                        </div>
                    </section>

                    <section className="bg-white border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-black text-slate-800">Editor Avanzado JSON</h2>
                            <button
                                onClick={() => setAdvancedOpen((v) => !v)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700"
                            >
                                {advancedOpen ? 'Ocultar' : 'Mostrar'}
                            </button>
                        </div>
                        {advancedOpen && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
                                {mergedItems.map((item) => (
                                    <div key={item.key} className="border rounded-xl p-3 bg-slate-50">
                                        <p className="text-xs font-black text-slate-700">{item.key}</p>
                                        <textarea
                                            className="mt-2 w-full min-h-[200px] rounded-lg border p-3 text-xs font-mono"
                                            value={jsonDraft[item.key] ?? prettyJson(item.content)}
                                            onChange={(e) => setJsonDraft((prev) => ({ ...prev, [item.key]: e.target.value }))}
                                        />
                                        <button
                                            onClick={() => saveAdvancedJson(item.key)}
                                            className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white"
                                        >
                                            Guardar JSON
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}

