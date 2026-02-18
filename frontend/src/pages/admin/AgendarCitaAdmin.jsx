import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { staffService } from '../../services/staffService'; 
import { citasService } from '../../services/citasService'; 
import NuevaCita from '../system/NuevaCita'; 
import Swal from 'sweetalert2';
import { 
    FaSearch, FaArrowLeft, FaUserCircle, FaIdCard, FaSpinner, 
    FaCalendarCheck, FaStethoscope, FaUserNurse, FaNotesMedical, FaCheck, FaHospital 
} from 'react-icons/fa';

const AgendarCitaAdmin = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // 1. DATOS DE LA URL (Modo Express)
    const preProfId = searchParams.get('prof');
    const preFecha = searchParams.get('fecha');
    const preHora = searchParams.get('hora');
    const preSede = searchParams.get('sede'); // <--- NUEVO: Capturamos la sede seleccionada
    
    const isExpressMode = !!(preProfId && preFecha && preHora);

    // 2. ESTADOS
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
    const [search, setSearch] = useState('');
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Estados para servicios
    const [serviciosProf, setServiciosProf] = useState([]);
    const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
    const [loadingServicios, setLoadingServicios] = useState(false);

    // --- CARGA DE SERVICIOS FILTRADOS POR PROFESIONAL ---
    useEffect(() => {
        if (isExpressMode && preProfId) {
            const cargarServiciosHabilitados = async () => {
                setLoadingServicios(true);
                try {
                    const [allProfs, allServices] = await Promise.all([
                        staffService.getProfesionales(),
                        staffService.getServicios()
                    ]);

                    const currentProf = allProfs.find(p => p.id === parseInt(preProfId));

                    if (currentProf && currentProf.servicios_habilitados && currentProf.servicios_habilitados.length > 0) {
                        const filtrados = allServices.filter(s => 
                            currentProf.servicios_habilitados.includes(s.id)
                        );
                        setServiciosProf(filtrados);
                    } else {
                        setServiciosProf(allServices);
                    }
                } catch (error) {
                    console.error("Error cargando servicios", error);
                    Swal.fire('Error', 'No se pudieron cargar los servicios.', 'error');
                } finally {
                    setLoadingServicios(false);
                }
            };
            cargarServiciosHabilitados();
        }
    }, [isExpressMode, preProfId]);

    // --- BÚSQUEDA DE PACIENTES ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search.trim().length >= 3) ejecutarBusqueda(search);
            else if (search.trim().length === 0) setResultados([]);
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const ejecutarBusqueda = async (query) => {
        setLoading(true);
        try {
            const data = await patientService.getAll({ search: query, admin_mode: true });
            const lista = Array.isArray(data) ? data : (data.results || []);
            setResultados(lista);
        } catch (error) {
            console.error("Error buscando paciente:", error);
            setResultados([]);
        } finally {
            setLoading(false);
        }
    };

    // --- GUARDAR CITA EXPRESS ---
    const handleConfirmarCitaExpress = async () => {
        if (!servicioSeleccionado) {
            return Swal.fire('Atención', 'Seleccione un servicio para continuar.', 'warning');
        }

        try {
            Swal.fire({ 
                title: 'Agendando...', 
                text: 'Reservando el espacio...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading() 
            });
            
            await citasService.create({
                paciente_id: pacienteSeleccionado.id,
                profesional_id: preProfId,
                lugar_id: preSede, // <--- CRÍTICO: Enviamos la sede correcta
                servicio_id: servicioSeleccionado,
                fecha: preFecha,
                hora_inicio: preHora,
                estado: 'PENDIENTE', 
                origen: 'ADMIN_EXPRESS'
            });

            await Swal.fire({ 
                icon: 'success', 
                title: 'Cita Agendada', 
                text: 'El paciente ha sido notificado.', 
                timer: 2000,
                showConfirmButton: false
            });
            
            // Volver a la grilla
            navigate('/dashboard/admin/agenda'); 

        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.detail || 'No se pudo agendar. Verifique disponibilidad.';
            Swal.fire('Error', msg, 'error');
        }
    };

    // --- UI: TARJETA DE SERVICIO ---
    const renderServiceCard = (servicio) => {
        const isSelected = servicioSeleccionado === servicio.id;
        
        let Icon = FaStethoscope;
        const nombre = servicio.nombre.toLowerCase();
        if (nombre.includes('enfermer')) Icon = FaUserNurse;
        if (nombre.includes('citologia') || nombre.includes('laboratorio')) Icon = FaNotesMedical;

        return (
            <div 
                key={servicio.id}
                onClick={() => setServicioSeleccionado(servicio.id)}
                className={`
                    relative cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 h-32 text-center group select-none
                    ${isSelected 
                        ? 'border-indigo-600 bg-indigo-50 shadow-lg scale-105 z-10 ring-2 ring-indigo-200' 
                        : 'border-gray-100 bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-1'
                    }
                `}
            >
                <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors mb-1
                    ${isSelected 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'bg-indigo-50 text-indigo-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}
                `}>
                    <Icon />
                </div>
                <span className={`
                    text-[10px] font-black uppercase tracking-wide leading-tight px-1
                    ${isSelected ? 'text-indigo-900' : 'text-gray-500 group-hover:text-gray-800'}
                `}>
                    {servicio.nombre}
                </span>
                
                {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm animate-bounce-short">
                        <FaCheck />
                    </div>
                )}
            </div>
        );
    };

    // --- VISTA 2: PANEL DE CONFIRMACIÓN ---
    if (pacienteSeleccionado) {
        if (isExpressMode) {
            return (
                <div className="animate-fadeIn p-4 md:p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[600px]">
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden w-full max-w-3xl">
                        
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-8 text-white text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 pattern-dots"></div>
                            <h2 className="text-2xl font-black uppercase tracking-widest mb-2 relative z-10">Confirmar Cita</h2>
                            
                            <div className="flex flex-wrap justify-center gap-3 relative z-10">
                                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                    <FaCalendarCheck/> {preFecha} | {preHora}
                                </div>
                                {preSede && (
                                    <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                        <FaHospital/> Sede ID: {preSede}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-6 md:p-8 space-y-6">
                            
                            {/* Info Paciente */}
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-200 relative group hover:border-indigo-200 transition-colors">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl text-indigo-500 shadow-sm border border-gray-100">
                                    <FaUserCircle />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black text-white bg-gray-400 px-2 py-0.5 rounded uppercase tracking-widest">Paciente</span>
                                    </div>
                                    <h3 className="text-lg font-black text-gray-800 leading-none mb-1">
                                        {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-mono">
                                        <FaIdCard className="inline mr-1 text-indigo-400"/> {pacienteSeleccionado.numero_documento}
                                    </p>
                                </div>
                                <button onClick={() => setPacienteSeleccionado(null)} className="absolute right-4 top-4 text-[10px] text-indigo-600 hover:underline font-bold bg-white px-2 py-1 rounded shadow-sm">
                                    Cambiar
                                </button>
                            </div>

                            {/* Selección de Servicio */}
                            <div>
                                <div className="flex items-center justify-center gap-3 mb-4">
                                    <div className="h-px bg-gray-200 flex-1"></div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleccione el Servicio</span>
                                    <div className="h-px bg-gray-200 flex-1"></div>
                                </div>
                                
                                {loadingServicios ? (
                                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <FaSpinner className="animate-spin text-indigo-500 mb-2" size={24}/>
                                        <span className="text-xs font-bold text-gray-400 animate-pulse">Cargando servicios habilitados...</span>
                                    </div>
                                ) : serviciosProf.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-indigo-100">
                                        {serviciosProf.map(renderServiceCard)}
                                    </div>
                                ) : (
                                    <div className="text-center p-6 bg-orange-50 rounded-2xl text-orange-600 text-xs border border-orange-100 font-bold">
                                        Este profesional no tiene servicios específicos configurados.
                                    </div>
                                )}
                            </div>

                            {/* Botón Acción */}
                            <div className="pt-2">
                                <button 
                                    onClick={handleConfirmarCitaExpress} 
                                    disabled={!servicioSeleccionado}
                                    className={`
                                        w-full py-3.5 rounded-2xl font-black text-white shadow-xl transition-all transform active:scale-[0.98] uppercase tracking-wide text-xs md:text-sm flex items-center justify-center gap-2
                                        ${servicioSeleccionado 
                                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-1 cursor-pointer' 
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}
                                    `}
                                >
                                    {servicioSeleccionado ? <FaCheck size={16}/> : <FaCalendarCheck size={16}/>}
                                    {servicioSeleccionado ? 'Confirmar Agendamiento' : 'Seleccione servicio'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // MODO NORMAL (Wizard)
        return (
            <div className="animate-fadeIn p-4 max-w-5xl mx-auto">
                <button
                    onClick={() => { setPacienteSeleccionado(null); setSearch(''); setResultados([]); }}
                    className="mb-4 flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-50 text-sm"
                >
                    <FaArrowLeft/> Volver
                </button>
                <NuevaCita adminSelectedPatientId={pacienteSeleccionado.id} isAdminMode={true} />
            </div>
        );
    }

    // VISTA 1: BUSCADOR
    return (
        <div className="max-w-3xl mx-auto p-6 min-h-[600px] flex flex-col justify-center">
            <div className="text-center mb-8">
                <div className="inline-block p-3 bg-indigo-50 rounded-2xl text-indigo-600 mb-3 shadow-sm border border-indigo-100">
                    <FaUserCircle size={28}/>
                </div>
                <h1 className="text-2xl font-black text-gray-800 mb-1 tracking-tight">
                    {isExpressMode ? 'Seleccione el Paciente' : 'Agendamiento Administrativo'}
                </h1>
                <p className="text-gray-500 text-sm font-medium">
                    {isExpressMode ? 'Busque el paciente para asignar al espacio seleccionado.' : 'Gestión general de citas.'}
                </p>
            </div>

            <div className="relative mb-6 group">
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[1.5rem] blur opacity-20 group-hover:opacity-40 transition duration-500 ${loading ? 'opacity-50' : ''}`}></div>
                <div className="relative flex items-center bg-white rounded-[1.4rem] shadow-xl border border-gray-100 p-1.5 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
                    <div className="pl-4 text-gray-400">
                        {loading ? <FaSpinner className="animate-spin text-indigo-500" size={20}/> : <FaSearch size={20} className="group-hover:text-indigo-500 transition-colors"/>}
                    </div>
                    <input 
                        type="text" 
                        className="w-full pl-3 pr-4 py-3 text-lg font-bold outline-none bg-transparent text-gray-700 placeholder:text-gray-300 placeholder:font-normal" 
                        placeholder="Nombre o documento..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        autoFocus 
                    />
                </div>
            </div>

            <div className="grid gap-3">
                {resultados.length === 0 && search.length >= 3 && !loading && (
                    <div className="text-center py-8 text-gray-400 text-sm">No se encontraron pacientes.</div>
                )}
                
                {resultados.map(p => (
                    <div
                        key={p.id}
                        onClick={() => setPacienteSeleccionado(p)}
                        className="bg-white p-3.5 rounded-xl border border-gray-100 flex justify-between items-center hover:shadow-lg hover:border-indigo-300 cursor-pointer transition-all group transform hover:-translate-y-0.5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
                                <FaUserCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm leading-tight group-hover:text-indigo-700 transition-colors">
                                    {p.nombre} {p.apellido}
                                </h4>
                                <p className="text-gray-400 text-[10px] font-bold font-mono mt-0.5">
                                    {p.numero_documento}
                                </p>
                            </div>
                        </div>
                        <FaArrowLeft className="text-gray-300 group-hover:text-indigo-600 transform rotate-180 transition-colors" size={14}/>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AgendarCitaAdmin;
