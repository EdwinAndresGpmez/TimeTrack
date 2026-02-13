import React, { useEffect, useState, useRef } from 'react';
import { configService } from '../../services/configService';
import { authService } from '../../services/authService'; // Agregado para Branding
import Swal from 'sweetalert2';
import * as FaIcons from 'react-icons/fa';
import AdminMenu from './AdminMenu';
import AdminSidebarBranding from './AdminSidebarBranding'; // Importación del nuevo componente
import {
    FaCogs, FaSave, FaClock, FaCalendarCheck, FaToggleOn,
    FaUserEdit, FaUserSlash, FaMagic, FaPlus, FaTrash,
    FaArrowRight, FaExclamationTriangle, FaTimes, FaLayerGroup,
    FaShieldAlt, FaChevronDown, FaInfoCircle, FaPalette
} from 'react-icons/fa';

// --- 1. PALETA DE COLORES (Para el borde lateral del estado) ---
const COLOR_PRESETS = [
    { name: 'yellow', hex: '#EAB308', label: 'Amarillo' },
    { name: 'green', hex: '#16A34A', label: 'Verde' },
    { name: 'indigo', hex: '#4F46E5', label: 'Índigo' },
    { name: 'blue', hex: '#2563EB', label: 'Azul' },
    { name: 'red', hex: '#DC2626', label: 'Rojo' },
    { name: 'gray', hex: '#6B7280', label: 'Gris' },
    { name: 'warning', hex: '#F97316', label: 'Naranja' },
    { name: 'pink', hex: '#EC4899', label: 'Rosa' },
    { name: 'purple', hex: '#8B5CF6', label: 'Violeta' },
    { name: 'teal', hex: '#14B8A6', label: 'Turquesa' },
];

// --- 2. ICONOS DISPONIBLES ---
const ICON_OPTIONS = [
    'FaClock', 'FaCheckCircle', 'FaHourglassHalf', 'FaCalendarCheck',
    'FaBan', 'FaTimesCircle', 'FaUserClock', 'FaStethoscope', 'FaHospital',
    'FaClipboardList', 'FaExclamationCircle', 'FaNotesMedical', 'FaUserMd',
    'FaPhone', 'FaMoneyBillWave', 'FaCheckDouble', 'FaBed', 'FaSyringe',
    'FaFileInvoiceDollar', 'FaPrint', 'FaWhatsapp', 'FaEnvelope'
];

// --- 3. ESTILOS DE BOTONES ---
const BUTTON_STYLES = [
    { id: 'blue', label: 'Azul (Estándar)', class: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'success', label: 'Verde (Éxito)', class: 'bg-green-100 text-green-700 border-green-200' },
    { id: 'danger', label: 'Rojo (Peligro)', class: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'warning', label: 'Naranja (Alerta)', class: 'bg-orange-100 text-orange-700 border-orange-200' },
    { id: 'indigo', label: 'Índigo (Info)', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { id: 'purple', label: 'Morado (Factura)', class: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'pink', label: 'Rosa (Especial)', class: 'bg-pink-100 text-pink-700 border-pink-200' },
    { id: 'teal', label: 'Cian (Procesos)', class: 'bg-teal-100 text-teal-700 border-teal-200' },
    { id: 'gray', label: 'Gris (Neutro)', class: 'bg-gray-100 text-gray-600 border-gray-300' },
    { id: 'dark', label: 'Oscuro (Admin)', class: 'bg-gray-700 text-gray-100 border-gray-600' },
];

// Función auxiliar para hex
const getColorHex = (colorValue) => {
    if (!colorValue) return '#6B7280';
    if (colorValue.startsWith('#')) return colorValue;
    const preset = COLOR_PRESETS.find(p => p.name === colorValue);
    return preset ? preset.hex : '#6B7280';
};

// --- COMPONENTES UI ---

const InfoTooltip = ({ text }) => (
    <div className="group relative inline-block ml-2 align-middle z-50">
        <FaInfoCircle className="text-gray-400 hover:text-blue-600 cursor-help transition-colors text-sm" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none leading-relaxed border border-gray-700 z-[100]">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800"></div>
        </div>
    </div>
);

const IconSelector = ({ value, onChange, compact = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const SelectedIcon = FaIcons[value] || FaIcons.FaCircle;

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between gap-2 border border-gray-200 rounded-lg bg-white hover:border-blue-500 transition-colors focus:ring-2 focus:ring-blue-200 ${compact ? 'p-1.5 text-xs' : 'p-2 text-sm'}`}
            >
                <div className="flex items-center gap-2 text-gray-700 truncate">
                    <SelectedIcon className="text-lg text-indigo-600 shrink-0" />
                    {!compact && <span className="font-mono text-xs truncate">{value}</span>}
                </div>
                <FaChevronDown className={`text-gray-400 text-xs transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 grid grid-cols-5 gap-2 left-0 animate-fade-in max-h-60 overflow-y-auto">
                    {ICON_OPTIONS.map((iconName) => {
                        const Icon = FaIcons[iconName] || FaIcons.FaCircle;
                        return (
                            <button
                                key={iconName}
                                type="button"
                                onClick={() => { onChange(iconName); setIsOpen(false); }}
                                className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-indigo-50 transition-colors h-10 w-10 ${value === iconName ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'text-gray-500'}`}
                                title={iconName}
                            >
                                <Icon className="text-lg" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ButtonStyleSelector = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const currentStyle = BUTTON_STYLES.find(s => s.id === value) || BUTTON_STYLES[0];

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-lg p-1.5 text-xs bg-white hover:border-indigo-400 transition-colors"
            >
                <div className={`px-2 py-1 rounded text-[10px] font-bold border flex-1 text-center truncate ${currentStyle.class}`}>
                    {currentStyle.label.split(' ')[0]}
                </div>
                <FaChevronDown className={`text-gray-400 text-[10px] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl p-2 left-0 animate-fade-in max-h-60 overflow-y-auto">
                    <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Selecciona Estilo</div>
                    <div className="space-y-1">
                        {BUTTON_STYLES.map((style) => (
                            <button
                                key={style.id}
                                type="button"
                                onClick={() => { onChange(style.id); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-2 hover:bg-gray-50 ${value === style.id ? 'ring-1 ring-indigo-500 bg-indigo-50' : ''}`}
                            >
                                <div className={`w-4 h-4 rounded border ${style.class}`}></div>
                                <span>{style.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ConfiguracionSistema = () => {
    const [activeTab, setActiveTab] = useState('reglas');
    const [loading, setLoading] = useState(true);

    // Estado de Configuración General
    const [config, setConfig] = useState({
        max_citas_dia_paciente: 1,
        permitir_mismo_servicio_dia: false,
        dias_para_actualizar_datos: 180,
        limite_inasistencias: 3,
        mensaje_bloqueo_inasistencia: '',
        horas_antelacion_cancelar: 24,
        mensaje_notificacion_cancelacion: '',
        workflow_citas: [],
        grupos_excepcion_antelacion: 'Administrador, Recepcion',
        sidebar_bg_color: '#0f172a',
        sidebar_accent_color: '#34d399',
        sidebar_logo_url: '',
        sidebar_variant: 'floating',
        sidebar_border_radius: 24,
    });

    // Estado específico para el Branding (Nuevo modelo)
    const [brandingConfig, setBrandingConfig] = useState({
        empresa_nombre: 'TimeTrack',
        logo_url: '',
        bg_color: '#0f172a',
        accent_color: '#34d399',
        variant: 'floating',
        border_radius: 24
    });

    useEffect(() => {
        cargarTodo();
    }, []);

    const cargarTodo = async () => {
        setLoading(true);
        try {
            // Cargar Configuración Global y Branding en paralelo
            const [dataConfig, dataBranding] = await Promise.all([
                configService.getConfig(),
                authService.getBranding()
            ]);

            if (dataConfig) {
                setConfig({
                    ...dataConfig,
                    workflow_citas: dataConfig.workflow_citas || []
                });
            }

            if (dataBranding) {
                setBrandingConfig(dataBranding);
            }
        } catch (error) {
            console.error("Error cargando la configuración:", error);
            Swal.fire('Error', 'No se pudo sincronizar la información del servidor.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const cargarConfig = async () => {
        // Esta función se mantiene por compatibilidad si se llama individualmente
        await cargarTodo();
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setConfig({ ...config, [e.target.name]: value });
    };

    // --- HANDLERS WORKFLOW ---
    const addState = () => {
        const newState = {
            slug: `ESTADO_${Date.now()}`,
            label: 'Nuevo Estado',
            color: '#6B7280',
            icon: 'FaCircle',
            acciones: []
        };
        setConfig(prev => ({ ...prev, workflow_citas: [...prev.workflow_citas, newState] }));
    };

    const removeState = (index) => {
        Swal.fire({
            title: '¿Eliminar Estado?',
            text: 'Si hay citas en este estado, podrían dejar de ser visibles en el panel.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar'
        }).then((result) => {
            if (result.isConfirmed) {
                const newWorkflow = [...config.workflow_citas];
                newWorkflow.splice(index, 1);
                setConfig({ ...config, workflow_citas: newWorkflow });
            }
        });
    };

    const updateStateField = (index, field, value) => {
        const newWorkflow = [...config.workflow_citas];
        newWorkflow[index][field] = value;
        setConfig({ ...config, workflow_citas: newWorkflow });
    };

    const addAction = (stateIndex) => {
        const newAction = {
            target: config.workflow_citas[0]?.slug || '',
            label: 'Ir a...',
            tipo: 'blue',
            icon: 'FaArrowRight',
            requiere_motivo: false,
            requiere_nota_medica: false
        };
        const newWorkflow = [...config.workflow_citas];
        newWorkflow[stateIndex].acciones.push(newAction);
        setConfig({ ...config, workflow_citas: newWorkflow });
    };

    const removeAction = (stateIndex, actionIndex) => {
        const newWorkflow = [...config.workflow_citas];
        newWorkflow[stateIndex].acciones.splice(actionIndex, 1);
        setConfig({ ...config, workflow_citas: newWorkflow });
    };

    const updateActionField = (stateIndex, actionIndex, field, value) => {
        const newWorkflow = [...config.workflow_citas];
        newWorkflow[stateIndex].acciones[actionIndex][field] = value;
        setConfig({ ...config, workflow_citas: newWorkflow });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (activeTab === 'branding') {
                // GUARDAR SOLO BRANDING
                await authService.updateBranding(brandingConfig);
                Swal.fire('¡Éxito!', 'Diseño del Sidebar actualizado.', 'success');
            }
            else if (activeTab === 'menus') {
                // INFO PARA MENÚS (se guardan por fila individual)
                Swal.fire(
                    'Info',
                    'Para Menús y Permisos, use los iconos de guardado individuales de cada fila.',
                    'info'
                );
            }
            else {
                // GUARDAR REGLAS DE NEGOCIO (todo lo de config)
                await configService.updateConfig(config);
                Swal.fire('¡Éxito!', 'Configuración de reglas guardada.', 'success');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="max-w-7xl mx-auto p-6 min-h-screen bg-gray-50/50">
            {/* ENCABEZADO */}
            <div className="flex items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl shadow-lg transform -rotate-3">
                    <FaCogs size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight">Configuración del Sistema</h1>
                    <p className="text-gray-500 font-medium">Gestiona reglas de negocio, políticas e identidad visual.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>

                {/* BARRA DE PESTAÑAS */}
                <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-xl border border-gray-200 shadow-sm sticky top-4 z-20">
                    {[
                        { id: 'reglas', label: 'Reglas Generales', icon: <FaCalendarCheck /> },
                        { id: 'inasistencias', label: 'Inasistencias', icon: <FaUserSlash /> },
                        { id: 'tiempos', label: 'Tiempos y Cancelación', icon: <FaClock /> },
                        { id: 'workflow', label: 'Motor de Flujos (Workflow)', icon: <FaMagic />, special: true },
                        { id: 'menus', label: 'Menús y Permisos', icon: <FaLayerGroup />, special: true },
                        { id: 'branding', label: 'Branding Sidebar', icon: <FaPalette />, special: true }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200
                                ${activeTab === tab.id
                                    ? (tab.special ? 'bg-indigo-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md')
                                    : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
                            `}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 min-h-[500px]">

                    {/* --- PESTAÑA 1: REGLAS GENERALES --- */}
                    {activeTab === 'reglas' && (
                        <div className="animate-fade-in space-y-8">
                            <div className="border-b pb-4 mb-4">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <FaLayerGroup className="text-blue-500" /> Límites de Agendamiento
                                </h3>
                                <p className="text-sm text-gray-500">Restricciones para pacientes al momento de solicitar citas.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                    <label className="block font-bold text-gray-700 mb-2">Máximo de Citas por Día</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            name="max_citas_dia_paciente"
                                            value={config.max_citas_dia_paciente}
                                            onChange={handleChange}
                                            min="1"
                                            className="w-24 text-center text-xl font-bold p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-blue-800"
                                        />
                                        <span className="text-sm font-medium text-gray-500">citas permitidas por paciente/día</span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex items-center justify-between">
                                    <div>
                                        <label className="block font-bold text-gray-700">Repetir Servicio</label>
                                        <p className="text-xs text-gray-500 mt-1">¿Permitir 2 citas del mismo servicio el mismo día?</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold ${config.permitir_mismo_servicio_dia ? 'text-green-600' : 'text-gray-400'}`}>
                                            {config.permitir_mismo_servicio_dia ? 'SÍ' : 'NO'}
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="permitir_mismo_servicio_dia"
                                                checked={config.permitir_mismo_servicio_dia}
                                                onChange={handleChange}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                                    <FaShieldAlt className="text-indigo-500" /> Privilegios Especiales
                                </h3>
                                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 relative overflow-hidden group">
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                                        <FaShieldAlt size={120} />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <label className="font-bold text-indigo-900">Grupos con Excepción de Antelación</label>
                                            <InfoTooltip text="Los usuarios pertenecientes a estos grupos podrán agendar citas con menos de 1 hora de antelación." />
                                        </div>

                                        <input
                                            type="text"
                                            name="grupos_excepcion_antelacion"
                                            value={config.grupos_excepcion_antelacion || ''}
                                            onChange={handleChange}
                                            placeholder="Ej: Administrador, Recepcion"
                                            className="w-full border-indigo-200 rounded-xl p-4 text-sm font-medium text-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm placeholder:text-indigo-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                                    <FaUserEdit className="text-teal-500" /> Calidad de Datos
                                </h3>
                                <div className="bg-teal-50 p-6 rounded-xl border border-teal-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <label className="font-bold text-teal-900">Frecuencia de Actualización</label>
                                        <p className="text-xs text-teal-700 mt-1">Cada cuánto tiempo el sistema obliga al paciente a revisar sus datos.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            name="dias_para_actualizar_datos"
                                            value={config.dias_para_actualizar_datos}
                                            onChange={handleChange}
                                            min="0"
                                            className="w-24 text-center font-bold p-2 border border-teal-200 rounded-lg text-teal-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                        <span className="font-bold text-teal-600 text-sm">Días</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PESTAÑA 2: INASISTENCIAS --- */}
                    {activeTab === 'inasistencias' && (
                        <div className="animate-fade-in">
                            <div className="border-b pb-4 mb-6">
                                <h3 className="text-xl font-bold text-red-700 flex items-center gap-2"><FaShieldAlt /> Sanciones Automáticas</h3>
                                <p className="text-sm text-gray-500">Configura el bloqueo automático de usuarios por mal comportamiento.</p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="md:col-span-1 bg-red-50 p-6 rounded-xl border border-red-100 text-center">
                                    <label className="block font-bold text-red-800 mb-2">Límite de Faltas</label>
                                    <div className="text-5xl font-black text-red-600 mb-2">{config.limite_inasistencias}</div>
                                    <input type="range" name="limite_inasistencias" value={config.limite_inasistencias} onChange={handleChange} min="0" max="10" className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block font-bold text-gray-700 mb-2">Mensaje de Bloqueo para el Paciente</label>
                                    <textarea
                                        name="mensaje_bloqueo_inasistencia"
                                        value={config.mensaje_bloqueo_inasistencia}
                                        onChange={handleChange}
                                        rows="4"
                                        className="w-full border-gray-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-gray-50"
                                        placeholder="Ej: Su cuenta ha sido suspendida temporalmente..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PESTAÑA 3: TIEMPOS --- */}
                    {activeTab === 'tiempos' && (
                        <div className="animate-fade-in">
                            <div className="border-b pb-4 mb-6">
                                <h3 className="text-xl font-bold text-orange-700 flex items-center gap-2"><FaClock /> Políticas de Tiempo</h3>
                                <p className="text-sm text-gray-500">Reglas para cancelación y modificación de agenda.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div>
                                        <label className="font-bold text-orange-900 text-lg">Antelación Mínima para Cancelar</label>
                                        <p className="text-sm text-orange-700">Si el paciente intenta cancelar después de este tiempo, el sistema lo rechazará.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="number" name="horas_antelacion_cancelar" value={config.horas_antelacion_cancelar} onChange={handleChange} min="0" className="w-24 text-center font-black text-2xl p-2 border border-orange-200 rounded-lg text-orange-800 bg-white" />
                                        <span className="font-bold text-orange-800">Horas</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-2">Mensaje de Error (Cancelación Tardía)</label>
                                    <input
                                        type="text"
                                        name="mensaje_notificacion_cancelacion"
                                        value={config.mensaje_notificacion_cancelacion}
                                        onChange={handleChange}
                                        className="w-full border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PESTAÑA 4: MOTOR DE FLUJO (WORKFLOW) --- */}
                    {activeTab === 'workflow' && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <div>
                                    <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2"><FaMagic /> Diseñador de Flujos</h3>
                                    <p className="text-xs text-indigo-700">Personaliza los estados de la cita y las transiciones permitidas.</p>
                                </div>
                                <button type="button" onClick={addState} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition active:scale-95 whitespace-nowrap">
                                    <FaPlus /> Crear Estado
                                </button>
                            </div>

                            <div className="space-y-6">
                                {config.workflow_citas.map((state, sIdx) => (
                                    <div key={sIdx} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 relative group">
                                        <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl" style={{ backgroundColor: getColorHex(state.color) }}></div>
                                        <div className="p-6 pl-8">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full pr-12">
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Visible</label>
                                                        <input type="text" value={state.label} onChange={(e) => updateStateField(sIdx, 'label', e.target.value)} className="w-full font-bold text-gray-800 border-b border-gray-300 focus:border-indigo-500 outline-none py-1 bg-transparent" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Slug (Código)</label>
                                                            <InfoTooltip text="El Slug es el ID interno. Debe ser único." />
                                                        </div>
                                                        <input type="text" value={state.slug} onChange={(e) => updateStateField(sIdx, 'slug', e.target.value.toUpperCase().replace(/\s+/g, '_'))} className="w-full font-mono text-xs text-indigo-600 border-b border-gray-300 focus:border-indigo-500 outline-none py-1 bg-transparent uppercase" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Color</label>
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative overflow-hidden w-9 h-9 rounded-full shadow-sm ring-2 ring-gray-100 flex items-center justify-center bg-gray-50">
                                                                <input type="color" value={getColorHex(state.color)} onChange={(e) => updateStateField(sIdx, 'color', e.target.value)} className="absolute w-[150%] h-[150%] cursor-pointer p-0 border-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Icono</label>
                                                        <IconSelector value={state.icon} onChange={(newIcon) => updateStateField(sIdx, 'icon', newIcon)} />
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => removeState(sIdx)} className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition">
                                                    <FaTrash />
                                                </button>
                                            </div>

                                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><FaArrowRight className="text-indigo-400" /> Botones de Acción</h4>
                                                <div className="space-y-3">
                                                    {state.acciones.map((accion, aIdx) => (
                                                        <div key={aIdx} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                            <div className="flex-1 min-w-[150px]">
                                                                <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Texto</span>
                                                                <input type="text" placeholder="Ej: Facturar" value={accion.label} onChange={(e) => updateActionField(sIdx, aIdx, 'label', e.target.value)} className="w-full text-sm font-bold text-gray-700 border-none focus:ring-0 bg-transparent placeholder-gray-300" />
                                                            </div>
                                                            <FaArrowRight className="text-gray-300 text-xs mt-4" />
                                                            <div className="flex-1 min-w-[150px]">
                                                                <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Destino</span>
                                                                <select value={accion.target} onChange={(e) => updateActionField(sIdx, aIdx, 'target', e.target.value)} className="w-full text-sm bg-gray-50 border-gray-200 rounded px-2 py-1.5 text-indigo-700 font-bold outline-none">
                                                                    {config.workflow_citas.map(s => <option key={s.slug} value={s.slug}>{s.label}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="w-32">
                                                                <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Estilo</span>
                                                                <ButtonStyleSelector value={accion.tipo} onChange={(newStyle) => updateActionField(sIdx, aIdx, 'tipo', newStyle)} />
                                                            </div>
                                                            <div className="w-20">
                                                                <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Icono</span>
                                                                <IconSelector value={accion.icon || 'FaArrowRight'} onChange={(newIcon) => updateActionField(sIdx, aIdx, 'icon', newIcon)} compact={true} />
                                                            </div>
                                                            <div className="flex flex-col gap-1 px-2 border-l border-gray-200">
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input type="checkbox" checked={accion.requiere_nota_medica} onChange={(e) => updateActionField(sIdx, aIdx, 'requiere_nota_medica', e.target.checked)} className="accent-blue-600 w-3 h-3" />
                                                                    <FaIcons.FaClipboardList className={`text-xs ${accion.requiere_nota_medica ? 'text-blue-600' : 'text-gray-300'}`} />
                                                                </label>
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input type="checkbox" checked={accion.requiere_motivo} onChange={(e) => updateActionField(sIdx, aIdx, 'requiere_motivo', e.target.checked)} className="accent-red-500 w-3 h-3" />
                                                                    <FaExclamationTriangle className={`text-xs ${accion.requiere_motivo ? 'text-red-500' : 'text-gray-300'}`} />
                                                                </label>
                                                            </div>
                                                            <button type="button" onClick={() => removeAction(sIdx, aIdx)} className="text-gray-300 hover:text-red-500 mt-4"><FaTimes /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button type="button" onClick={() => addAction(sIdx)} className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition">
                                                    <FaPlus className="bg-indigo-100 p-0.5 rounded-full" /> Agregar Acción
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'menus' && <AdminMenu />}

                    {/* --- NUEVA PESTAÑA: BRANDING --- */}
                    {activeTab === 'branding' && (
                        <AdminSidebarBranding
                            brandingConfig={brandingConfig}
                            setBrandingConfig={setBrandingConfig}
                        />
                    )}

                </div>

                {/* BOTÓN FLOTANTE DE GUARDADO */}
                <div className="sticky bottom-6 flex justify-end mt-6 z-30">
                    <button type="submit" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-10 rounded-full shadow-2xl flex items-center gap-3 transition-all transform hover:-translate-y-1 hover:shadow-green-500/30">
                        <FaSave size={20} /> GUARDAR CAMBIOS
                    </button>
                </div>
            </form>

            <div className="hidden">
                <FaIcons.FaTimesCircle />
                <FaIcons.FaClipboardList />
            </div>
        </div>
    );
};

export default ConfiguracionSistema;