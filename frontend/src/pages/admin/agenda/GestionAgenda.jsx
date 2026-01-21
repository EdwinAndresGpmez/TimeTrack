import React, { useState, useEffect, useRef } from 'react';
import { staffService } from '../../../services/staffService';
import { agendaService } from '../../../services/agendaService';
import Swal from 'sweetalert2';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes, FaUsers, FaSearch, FaPlusCircle, FaCogs } from 'react-icons/fa';

import ListaProfesionales from './ListaProfesionales';
import GrillaSemanal from './GrillaSemanal';
import HistorialPanel from './HistorialAgendas'; 

// Paleta de colores para asignar visualmente a cada médico
const PALETA_COLORES = [
    { nombre: 'blue', clase: 'bg-blue-100 text-blue-800 border-blue-300' },
    { nombre: 'green', clase: 'bg-green-100 text-green-800 border-green-300' },
    { nombre: 'purple', clase: 'bg-purple-100 text-purple-800 border-purple-300' },
    { nombre: 'orange', clase: 'bg-orange-100 text-orange-800 border-orange-300' },
    { nombre: 'pink', clase: 'bg-pink-100 text-pink-800 border-pink-300' },
    { nombre: 'teal', clase: 'bg-teal-100 text-teal-800 border-teal-300' },
];

const GestionAgenda = () => {
    // --- ESTADOS DE DATOS ---
    const [sedes, setSedes] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [servicios, setServicios] = useState([]); 
    
    const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
    
    // MULTI-SELECCIÓN: Array de objetos médico
    const [selectedProfs, setSelectedProfs] = useState([]); 

    // DATA COMBINADA: { [profId]: { horarios: [], bloqueos: [] } }
    const [agendasCombinadas, setAgendasCombinadas] = useState({});
    
    const [loadingAgenda, setLoadingAgenda] = useState(false);
    
    // PUNTO 5: Estado editable para la duración por defecto
    const [duracionDefecto, setDuracionDefecto] = useState(20);
    
    const [viewMode, setViewMode] = useState('config'); // 'config' | 'historial'
    
    // --- ESTADOS CALENDARIO ---
    const [calendarView, setCalendarView] = useState('week'); // 'day', 'week', 'month'
    const [fechaReferencia, setFechaReferencia] = useState(new Date());
    
    // --- ESTADO MODAL FULL SCREEN ---
    const [isGridOpen, setIsGridOpen] = useState(false);
    
    // --- ESTADO BUSCADOR FOOTER ---
    const [footerSearch, setFooterSearch] = useState('');
    const [showFooterResults, setShowFooterResults] = useState(false);
    const footerInputRef = useRef(null);

    // 1. Carga Inicial de Catálogos
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [dataSedes, dataProfs, dataServ] = await Promise.all([
                    staffService.getLugares(),
                    staffService.getProfesionales(),
                    staffService.getServicios()
                ]);
                setSedes(dataSedes);
                setProfesionales(dataProfs);
                setServicios(dataServ);
                if(dataSedes.length > 0) setSedeSeleccionada(dataSedes[0].id);
            } catch (error) { console.error(error); }
        };
        cargarDatos();
    }, []);

    // 2. Reaccionar a cambios en selección para cargar agendas
    useEffect(() => {
        if (selectedProfs.length > 0 && sedeSeleccionada && viewMode === 'config') {
            cargarMultiplesAgendas();
        } else {
            setAgendasCombinadas({});
        }
    }, [selectedProfs, sedeSeleccionada, viewMode]);

    // --- PUNTO 7: COLOR CONSISTENTE ---
    const getColorForId = (id) => {
        // Usamos el ID para obtener siempre el mismo índice de color (Hash simple)
        const index = id % PALETA_COLORES.length;
        return PALETA_COLORES[index];
    };

    // --- LÓGICA MULTI-AGENDA ---
    const toggleProfesional = (prof) => {
        const isSelected = selectedProfs.some(p => p.id === prof.id);
        
        if (isSelected) {
            // Deseleccionar (Quitar de la lista)
            setSelectedProfs(prev => prev.filter(p => p.id !== prof.id));
        } else {
            // Seleccionar (Asignar color consistente basado en ID)
            const nuevoProf = { ...prof, colorInfo: getColorForId(prof.id) };
            setSelectedProfs(prev => [...prev, nuevoProf]);
        }
        // Limpiar buscador footer si se usó
        setFooterSearch('');
        setShowFooterResults(false);
    };

    const cargarMultiplesAgendas = async () => {
        setLoadingAgenda(true);
        const nuevasAgendas = {};
        
        try {
            // Ejecutamos peticiones en paralelo para todos los seleccionados
            const promesas = selectedProfs.map(async (prof) => {
                const [h, b] = await Promise.all([
                    agendaService.getDisponibilidades({ profesional_id: prof.id, lugar_id: sedeSeleccionada }),
                    agendaService.getBloqueos({ profesional_id: prof.id })
                ]);
                return { id: prof.id, data: { horarios: h, bloqueos: b } };
            });

            const resultados = await Promise.all(promesas);
            
            resultados.forEach(res => {
                nuevasAgendas[res.id] = res.data;
            });
            
            setAgendasCombinadas(nuevasAgendas);

        } catch (error) { 
            console.error("Error cargando agendas", error);
            Swal.fire('Error', 'No se pudieron cargar todas las agendas', 'error');
        } finally { 
            setLoadingAgenda(false); 
        }
    };

    // --- NAVEGACIÓN CALENDARIO ---
    const navegarCalendario = (direccion) => {
        const nuevaFecha = new Date(fechaReferencia);
        if (calendarView === 'day') nuevaFecha.setDate(nuevaFecha.getDate() + direccion);
        else if (calendarView === 'week') nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7));
        else if (calendarView === 'month') nuevaFecha.setMonth(nuevaFecha.getMonth() + direccion);
        setFechaReferencia(nuevaFecha);
    };

    const irAHoy = () => setFechaReferencia(new Date());


    // --- GESTIÓN DE TURNOS (CRUD) ---

    // 1. Crear Turno (Clic en el +)
    const handleCrearTurno = async (diaIndex, hora) => {
        let targetProfId = null;
        const diaNombre = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][diaIndex];

        // A. Si hay múltiples seleccionados, preguntar para quién es
        if (selectedProfs.length > 1) {
            const inputOptions = {};
            selectedProfs.forEach(p => {
                inputOptions[p.id] = p.nombre;
            });
            
            const { value: profId } = await Swal.fire({
                title: 'Seleccione Profesional',
                text: `¿Para quién deseas crear el horario del ${diaNombre} a las ${hora}:00?`,
                input: 'select',
                inputOptions: inputOptions,
                showCancelButton: true,
                confirmButtonText: 'Continuar'
            });

            if (!profId) return; // Cancelado
            targetProfId = profId;
        } else if (selectedProfs.length === 1) {
            // B. Si solo hay uno, seleccionarlo directo
            targetProfId = selectedProfs[0].id;
        } else {
            return;
        }

        // C. Formulario de detalles
        const horaInicio = `${hora.toString().padStart(2, '0')}:00`;
        const horaFin = `${(hora+1).toString().padStart(2, '0')}:00`;
        const opcionesServicios = servicios.map(s => `<option value="${s.id}">${s.nombre} (${s.duracion_minutos} min)</option>`).join('');

        const { value: formValues } = await Swal.fire({
            title: `Nuevo Turno: ${diaNombre}`,
            html: `
                <div class="text-left">
                    <label class="block text-sm font-bold text-gray-700">Horario</label>
                    <div class="flex gap-2 mb-3">
                        <input id="swal-inicio" type="time" class="swal2-input" value="${horaInicio}" style="margin:0">
                        <input id="swal-fin" type="time" class="swal2-input" value="${horaFin}" style="margin:0">
                    </div>
                    <label class="block text-sm font-bold text-gray-700">Enfoque / Servicio</label>
                    <select id="swal-servicio" class="swal2-select" style="margin:0; width:100%">
                        <option value="">General / Mixto (${duracionDefecto} min)</option>
                        ${opcionesServicios}
                    </select>
                </div>`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar',
            preConfirm: () => ({
                inicio: document.getElementById('swal-inicio').value,
                fin: document.getElementById('swal-fin').value,
                servicio: document.getElementById('swal-servicio').value
            })
        });

        // D. Guardar en Backend
        if (formValues) {
            try {
                await agendaService.createDisponibilidad({
                    profesional_id: targetProfId,
                    lugar_id: sedeSeleccionada, 
                    dia_semana: diaIndex,
                    hora_inicio: formValues.inicio, 
                    hora_fin: formValues.fin, 
                    servicio_id: formValues.servicio || null
                });
                
                await Swal.fire('Guardado', 'Horario creado exitosamente', 'success');
                cargarMultiplesAgendas(); // Recargar datos
            } catch (e) { 
                Swal.fire('Error', 'Verifica si ya existe un horario solapado', 'error'); 
            }
        }
    };

    // --- PUNTO 6: LOGICA REAL DE BLOQUEO ---
    const handleGestionarTurno = async (turno, fechaPreseleccionada) => {
        // En este punto ya sabemos qué turno es y a qué médico pertenece (viene en el objeto turno)
        
        const { value: accion } = await Swal.fire({
            title: 'Gestionar Horario',
            text: `Horario base: ${turno.hora_inicio} - ${turno.hora_fin}`,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Gestionar Bloqueo (Día)',
            denyButtonText: 'Eliminar Horario Base',
            confirmButtonColor: '#f59e0b', // Naranja para bloquear
            denyButtonColor: '#ef4444' // Rojo para eliminar
        });

        if (accion === true) {
            // CONFIRMADO: Bloquear el día
            const { value: motivo } = await Swal.fire({
                title: 'Crear Bloqueo de Agenda',
                text: `Se bloqueará la agenda del profesional para el día ${fechaPreseleccionada}.`,
                input: 'text',
                inputPlaceholder: 'Motivo (ej: Permiso, Vacaciones)',
                showCancelButton: true,
                confirmButtonText: 'Bloquear Agenda',
                inputValidator: (value) => !value && 'Debes escribir un motivo'
            });

            if (motivo) {
                try {
                    // Construir fechas inicio/fin para todo el día
                    const fechaInicio = `${fechaPreseleccionada}T00:00:00`;
                    const fechaFin = `${fechaPreseleccionada}T23:59:59`;
                    
                    await agendaService.createBloqueo({
                        profesional_id: turno.profesional_id,
                        fecha_inicio: fechaInicio,
                        fecha_fin: fechaFin,
                        motivo: motivo
                    });
                    
                    Swal.fire('Bloqueado', 'La agenda ha sido cerrada para este día.', 'success');
                    cargarMultiplesAgendas(); // RECARGAR PARA VER EL CAMBIO
                } catch (e) {
                    Swal.fire('Error', 'No se pudo crear el bloqueo.', 'error');
                }
            }

        } else if (accion === false) { 
            // DENEGADO: Eliminar disponibilidad base
             try {
                 await agendaService.deleteDisponibilidad(turno.id);
                 Swal.fire('Eliminado', 'Horario base eliminado', 'success');
                 cargarMultiplesAgendas();
             } catch(e) { Swal.fire('Error', 'No se pudo eliminar', 'error'); }
        }
    };

    // --- LÓGICA FILTRO FOOTER ---
    const resultadosFooter = footerSearch.length > 0 
        ? profesionales.filter(p => 
            !selectedProfs.find(sel => sel.id === p.id) && 
            p.nombre.toLowerCase().includes(footerSearch.toLowerCase())
          )
        : [];

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100 overflow-hidden relative">
            
            {/* --- 1. SIDEBAR (Lista de Profesionales) --- */}
            <div className="w-full md:w-80 flex-shrink-0 border-r border-gray-200 bg-white h-full z-20 flex flex-col shadow-lg">
                <ListaProfesionales 
                    sedes={sedes} profesionales={profesionales}
                    sedeSeleccionada={sedeSeleccionada} setSedeSeleccionada={setSedeSeleccionada}
                    selectedProfs={selectedProfs} 
                    toggleProfesional={toggleProfesional} 
                    onOpenModal={() => setIsGridOpen(true)}
                />
            </div>
            
            {/* --- 2. PANEL DERECHO (Historial o Dashboard Vacío) --- */}
            <div className="flex-1 flex flex-col h-full bg-gray-50 relative overflow-hidden">
                {viewMode === 'historial' ? (
                    <HistorialPanel profesionalSeleccionado={selectedProfs[0]} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md border border-gray-100">
                            <FaUsers size={48} className="mx-auto mb-4 text-blue-200"/>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">Gestión de Agendas</h3>
                            <p className="mb-6 text-sm">
                                Selecciona uno o varios profesionales del menú izquierdo. <br/>
                                Luego presiona el botón para gestionar sus horarios.
                            </p>
                            
                            {selectedProfs.length > 0 ? (
                                <button 
                                    onClick={() => setIsGridOpen(true)}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition font-bold flex items-center gap-2 mx-auto animate-pulse"
                                >
                                    <FaCalendarAlt /> Abrir Agenda ({selectedProfs.length})
                                </button>
                            ) : (
                                <div className="text-xs text-orange-400 bg-orange-50 p-2 rounded">
                                    ← Selecciona un médico para comenzar
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- 3. MODAL FULL SCREEN (La Grilla) --- */}
            {isGridOpen && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fadeIn">
                    
                    {/* Header del Modal */}
                    <div className="h-16 px-4 border-b flex items-center justify-between bg-white shadow-sm shrink-0 z-50">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsGridOpen(false)} className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full transition" title="Cerrar">
                                <FaTimes size={20}/>
                            </button>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FaCalendarAlt className="text-blue-600"/> Agenda
                                </h2>
                                <p className="text-xs text-gray-500 hidden sm:block">
                                    Viendo {selectedProfs.length} profesionales
                                </p>
                            </div>
                        </div>

                        {/* Controles de Calendario */}
                        <div className="flex items-center gap-2 md:gap-4">
                            
                            {/* PUNTO 5: CONTROL DE DURACIÓN VISIBLE */}
                            <div className="hidden lg:flex items-center gap-2 bg-gray-50 p-1 px-3 rounded-lg border border-gray-200">
                                <FaCogs className="text-gray-400"/>
                                <span className="text-xs font-bold text-gray-500">Intervalo:</span>
                                <input 
                                    type="number" 
                                    value={duracionDefecto} 
                                    onChange={(e) => setDuracionDefecto(parseInt(e.target.value) || 20)}
                                    className="w-12 text-center text-sm font-bold bg-white border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                <span className="text-xs text-gray-500">min</span>
                            </div>

                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <button onClick={() => navegarCalendario(-1)} className="p-1.5 hover:bg-white rounded shadow-sm text-gray-600"><FaChevronLeft/></button>
                                <button onClick={irAHoy} className="mx-1 px-3 py-1 text-sm font-bold text-gray-600 hover:bg-white rounded">Hoy</button>
                                <button onClick={() => navegarCalendario(1)} className="p-1.5 hover:bg-white rounded shadow-sm text-gray-600"><FaChevronRight/></button>
                            </div>
                            
                            <span className="font-bold text-gray-700 capitalize w-32 text-center hidden md:block">
                                {fechaReferencia.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                            
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setCalendarView('day')} className={`px-3 py-1 rounded text-xs font-bold ${calendarView === 'day' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Día</button>
                                <button onClick={() => setCalendarView('week')} className={`px-3 py-1 rounded text-xs font-bold ${calendarView === 'week' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Semana</button>
                                <button onClick={() => setCalendarView('month')} className={`px-3 py-1 rounded text-xs font-bold ${calendarView === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Mes</button>
                            </div>
                        </div>
                    </div>

                    {/* Contenido Grilla */}
                    <div className="flex-1 overflow-hidden relative bg-gray-50">
                        {loadingAgenda ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <GrillaSemanal 
                                selectedProfs={selectedProfs} 
                                agendasCombinadas={agendasCombinadas} 
                                servicios={servicios}
                                duracionDefecto={duracionDefecto} 
                                onCrearTurno={handleCrearTurno} 
                                onGestionarTurno={handleGestionarTurno}
                                calendarView={calendarView}
                                fechaReferencia={fechaReferencia}
                                setCalendarView={setCalendarView}
                                setFechaReferencia={setFechaReferencia}
                            />
                        )}
                    </div>
                    
                    {/* FOOTER CON BUSCADOR "QUICK ADD" */}
                    <div className="h-14 border-t bg-white flex items-center shrink-0 z-50">
                        
                        {/* ZONA 1: CHIPS SCROLLABLE (Izquierda) */}
                        <div className="flex-1 flex gap-3 overflow-x-auto p-2 scrollbar-thin items-center">
                            {selectedProfs.length === 0 && (
                                <span className="text-xs text-gray-400 italic px-2">No hay profesionales seleccionados</span>
                            )}
                            {selectedProfs.map(p => (
                                <div 
                                    key={p.id} 
                                    className={`px-2 py-1 rounded border flex items-center gap-2 shrink-0 ${p.colorInfo.clase} shadow-sm animate-fadeIn`}
                                >
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-current opacity-50"></div>
                                        <span className="font-bold truncate max-w-[150px] text-xs">{p.nombre}</span>
                                    </div>
                                    <button 
                                        onClick={() => toggleProfesional(p)} 
                                        className="hover:bg-white/50 rounded-full p-0.5 transition focus:outline-none text-current opacity-70 hover:opacity-100"
                                        title="Quitar de la vista"
                                    >
                                        <FaTimes size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* ZONA 2: BUSCADOR QUICK ADD (Fijo a la Derecha) */}
                        <div className="w-64 border-l pl-3 pr-3 py-2 bg-gray-50 relative h-full flex items-center group">
                            <FaSearch className="text-gray-400 mr-2 text-xs"/>
                            <input 
                                ref={footerInputRef}
                                type="text" 
                                placeholder="Agregar otro médico..." 
                                className="w-full bg-transparent text-sm outline-none placeholder-gray-400 text-gray-700"
                                value={footerSearch}
                                onChange={(e) => {
                                    setFooterSearch(e.target.value);
                                    setShowFooterResults(true);
                                }}
                                onFocus={() => setShowFooterResults(true)}
                            />

                            {/* DROPDOWN DE RESULTADOS (Flotante hacia ARRIBA) */}
                            {showFooterResults && footerSearch.length > 0 && (
                                <div className="absolute bottom-full right-0 left-0 mb-1 bg-white border border-gray-200 rounded-t-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                    {resultadosFooter.length === 0 ? (
                                        <div className="p-3 text-xs text-gray-400 text-center italic">No se encontraron profesionales</div>
                                    ) : (
                                        resultadosFooter.map(p => (
                                            <div 
                                                key={p.id}
                                                className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0 border-gray-100 flex items-center justify-between group/item"
                                                onClick={() => toggleProfesional(p)}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-700 group-hover/item:text-blue-700">{p.nombre}</span>
                                                    <span className="text-[10px] text-gray-400">{p.especialidades_nombres?.[0] || 'General'}</span>
                                                </div>
                                                <FaPlusCircle className="text-gray-300 group-hover/item:text-blue-500 transition"/>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            
                            {/* Overlay para cerrar al hacer clic fuera */}
                            {showFooterResults && (
                                <div 
                                    className="fixed inset-0 z-40 bg-transparent" 
                                    onClick={() => setShowFooterResults(false)}
                                ></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionAgenda;