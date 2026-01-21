import React, { useState, useEffect, useRef } from 'react';
import { staffService } from '../../../services/staffService';
import { agendaService } from '../../../services/agendaService';
import { citasService } from '../../../services/citasService'; 
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
    
    // MULTI-SELECCIÓN
    const [selectedProfs, setSelectedProfs] = useState([]); 

    // DATA COMBINADA
    const [agendasCombinadas, setAgendasCombinadas] = useState({});
    
    const [loadingAgenda, setLoadingAgenda] = useState(false);
    const [duracionDefecto, setDuracionDefecto] = useState(20);
    const [viewMode, setViewMode] = useState('config'); 
    
    // --- ESTADOS CALENDARIO ---
    const [calendarView, setCalendarView] = useState('week'); 
    const [fechaReferencia, setFechaReferencia] = useState(new Date());
    
    // --- ESTADOS UI ---
    const [isGridOpen, setIsGridOpen] = useState(false);
    const [footerSearch, setFooterSearch] = useState('');
    const [showFooterResults, setShowFooterResults] = useState(false);
    const footerInputRef = useRef(null);

    // 1. Carga Inicial
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

    // 2. Reaccionar a cambios en selección
    useEffect(() => {
        if (selectedProfs.length > 0 && sedeSeleccionada && viewMode === 'config') {
            cargarMultiplesAgendas();
        } else {
            setAgendasCombinadas({});
        }
    }, [selectedProfs, sedeSeleccionada, viewMode]);

    const getColorForId = (id) => {
        const index = id % PALETA_COLORES.length;
        return PALETA_COLORES[index];
    };

    const toggleProfesional = (prof) => {
        const isSelected = selectedProfs.some(p => p.id === prof.id);
        if (isSelected) {
            setSelectedProfs(prev => prev.filter(p => p.id !== prof.id));
        } else {
            const nuevoProf = { ...prof, colorInfo: getColorForId(prof.id) };
            setSelectedProfs(prev => [...prev, nuevoProf]);
        }
        setFooterSearch('');
        setShowFooterResults(false);
    };

    const cargarMultiplesAgendas = async () => {
        setLoadingAgenda(true);
        const nuevasAgendas = {};
        try {
            const promesas = selectedProfs.map(async (prof) => {
                const [h, b] = await Promise.all([
                    agendaService.getDisponibilidades({ profesional_id: prof.id, lugar_id: sedeSeleccionada }),
                    agendaService.getBloqueos({ profesional_id: prof.id })
                ]);
                return { id: prof.id, data: { horarios: h, bloqueos: b } };
            });

            const resultados = await Promise.all(promesas);
            resultados.forEach(res => { nuevasAgendas[res.id] = res.data; });
            setAgendasCombinadas(nuevasAgendas);
        } catch (error) { console.error(error); } 
        finally { setLoadingAgenda(false); }
    };

    const navegarCalendario = (direccion) => {
        const nuevaFecha = new Date(fechaReferencia);
        if (calendarView === 'day') nuevaFecha.setDate(nuevaFecha.getDate() + direccion);
        else if (calendarView === 'week') nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7));
        else if (calendarView === 'month') nuevaFecha.setMonth(nuevaFecha.getMonth() + direccion);
        setFechaReferencia(nuevaFecha);
    };

    const irAHoy = () => setFechaReferencia(new Date());

    // --- GESTIÓN DE TURNOS (CRUD) ---

    const handleCrearTurno = async (diaIndex, hora) => {
        let targetProfId = null;
        const diaNombre = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][diaIndex];

        // 1. Determinar el médico objetivo
        if (selectedProfs.length > 1) {
            const inputOptions = {};
            selectedProfs.forEach(p => { inputOptions[p.id] = p.nombre; });
            const { value: profId } = await Swal.fire({
                title: 'Seleccione Profesional',
                text: `Crear horario para el ${diaNombre} a las ${hora}:00`,
                input: 'select', inputOptions: inputOptions,
                showCancelButton: true, confirmButtonText: 'Continuar'
            });
            if (!profId) return;
            targetProfId = profId;
        } else if (selectedProfs.length === 1) {
            targetProfId = selectedProfs[0].id;
        } else { return; }

        // 2. FILTRAR SERVICIOS HABILITADOS PARA EL MÉDICO SELECCIONADO
        const profesionalObj = profesionales.find(p => p.id === parseInt(targetProfId));
        
        const serviciosFiltrados = servicios.filter(s => 
            // Si el médico tiene la propiedad servicios_habilitados, filtramos. Si no (undefined), mostramos todo por seguridad o nada.
            // Asumimos que AdminProfesionales guarda array de IDs en servicios_habilitados
            profesionalObj?.servicios_habilitados?.includes(s.id)
        );

        // Generar opciones solo con los servicios permitidos
        const opcionesServicios = serviciosFiltrados.length > 0 
            ? serviciosFiltrados.map(s => `<option value="${s.id}">${s.nombre} (${s.duracion_minutos} min)</option>`).join('')
            : '<option value="" disabled>El profesional no tiene servicios habilitados</option>';

        const horaInicio = `${hora.toString().padStart(2, '0')}:00`;
        const horaFin = `${(hora+1).toString().padStart(2, '0')}:00`;

        const { value: formValues } = await Swal.fire({
            title: `Nuevo Turno: ${diaNombre}`,
            html: `
                <div class="text-left">
                    <p class="text-xs text-blue-600 font-bold mb-2">Dr. ${profesionalObj?.nombre}</p>
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

        if (formValues) {
            try {
                await agendaService.createDisponibilidad({
                    profesional_id: targetProfId, lugar_id: sedeSeleccionada, dia_semana: diaIndex,
                    hora_inicio: formValues.inicio, hora_fin: formValues.fin, servicio_id: formValues.servicio || null
                });
                await Swal.fire('Guardado', 'Horario creado exitosamente', 'success');
                cargarMultiplesAgendas();
            } catch (e) { Swal.fire('Error', 'Verifica solapamientos', 'error'); }
        }
    };

    // --- GESTIÓN DE SLOT ESPECÍFICO ---
    const handleGestionarTurno = async (turno, fechaPreseleccionada) => {
        let duracion = duracionDefecto;
        let nombreServicio = "General / Mixto";
        if (turno.servicio_id) {
            const s = servicios.find(srv => srv.id === turno.servicio_id);
            if (s) { duracion = s.duracion_minutos; nombreServicio = s.nombre; }
        }

        let bloqueosFrescos = [];
        try {
            bloqueosFrescos = await agendaService.getBloqueos({ profesional_id: turno.profesional_id });
        } catch(e) { console.error(e); }

        const slots = [];
        let [h, m] = turno.hora_inicio.split(':').map(Number);
        const [hFin, mFin] = turno.hora_fin.split(':').map(Number);
        let actualMin = h * 60 + m;
        const finMin = hFin * 60 + mFin;
        const ahora = new Date();

        while (actualMin + duracion <= finMin) {
            const hh = Math.floor(actualMin / 60).toString().padStart(2, '0');
            const mm = (actualMin % 60).toString().padStart(2, '0');
            const finHH = Math.floor((actualMin + duracion) / 60).toString().padStart(2, '0');
            const finMM = ((actualMin + duracion) % 60).toString().padStart(2, '0');
            
            const inicioStr = `${hh}:${mm}`;
            const finStr = `${finHH}:${finMM}`;
            
            const bloqueoMatch = bloqueosFrescos.find(b => b.fecha_inicio.startsWith(`${fechaPreseleccionada}T${inicioStr}`));
            const slotDate = new Date(`${fechaPreseleccionada}T${inicioStr}:00`);
            const esPasado = slotDate < ahora;

            slots.push({
                inicio: inicioStr, fin: finStr,
                bloqueado: !!bloqueoMatch,
                bloqueoId: bloqueoMatch?.id,
                motivo: bloqueoMatch?.motivo,
                esPasado: esPasado
            });
            actualMin += duracion;
        }

        const slotsHtml = slots.map(slot => {
            let btnAction = '';
            let estadoClass = 'bg-white border-gray-200';
            let info = '';

            if (slot.esPasado) {
                estadoClass = 'bg-gray-100 opacity-60';
                btnAction = '<span class="text-xs text-gray-400 font-bold">Pasado</span>';
            } else if (slot.bloqueado) {
                estadoClass = 'bg-red-50 border-red-200';
                info = `<span class="text-[10px] text-red-600 block italic">🔒 ${slot.motivo}</span>`;
                btnAction = `<button onclick="window.gestionarSlot('DESBLOQUEAR', null, null, '${slot.bloqueoId}')" class="text-xs bg-white text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">Desbloquear</button>`;
            } else {
                btnAction = `<button onclick="window.gestionarSlot('BLOQUEAR', '${slot.inicio}', '${slot.fin}', null)" class="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100">Bloquear</button>`;
            }

            return `
                <div class="flex justify-between items-center p-2 mb-1 rounded border ${estadoClass}">
                    <div>
                        <span class="font-mono text-sm font-bold text-gray-700">${slot.inicio} - ${slot.fin}</span>
                        ${info}
                    </div>
                    ${btnAction}
                </div>
            `;
        }).join('');

        window.gestionarSlot = async (accion, inicio, fin, bloqueoId) => {
            if (accion === 'BLOQUEAR') {
                const { value: motivo } = await Swal.fire({
                    title: `Bloquear ${inicio}`,
                    input: 'text',
                    inputPlaceholder: 'Motivo (ej: Reunión)',
                    showCancelButton: true
                });
                if (motivo) {
                    try {
                        await agendaService.createBloqueo({
                            profesional_id: turno.profesional_id,
                            fecha_inicio: `${fechaPreseleccionada}T${inicio}:00`,
                            fecha_fin: `${fechaPreseleccionada}T${fin}:00`,
                            motivo: motivo
                        });
                        await cargarMultiplesAgendas(); 
                        handleGestionarTurno(turno, fechaPreseleccionada); 
                    } catch (e) { Swal.fire('Error', 'Fallo al bloquear', 'error'); }
                } else { handleGestionarTurno(turno, fechaPreseleccionada); }
            } 
            if (accion === 'DESBLOQUEAR') {
                try {
                    await agendaService.deleteBloqueo(bloqueoId);
                    await cargarMultiplesAgendas(); 
                    handleGestionarTurno(turno, fechaPreseleccionada); 
                } catch (e) { Swal.fire('Error', 'Fallo al desbloquear', 'error'); }
            }
        };

        window.eliminarTurnoBase = async (idTurno) => {
            Swal.close();
            
            const { isConfirmed } = await Swal.fire({
                title: '¿Eliminar Horario Recurrente?',
                html: `<p>Estás a punto de borrar la regla de disponibilidad <b>para todos los días futuros</b>.</p>
                       <p class="text-xs text-red-500 mt-2 font-bold">⚠️ Se verificará si existen pacientes agendados antes de proceder.</p>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, intentar eliminar'
            });

            if (isConfirmed) {
                Swal.showLoading();
                try {
                    const citasActivas = await citasService.getAll({
                        profesional_id: turno.profesional_id,
                        estado: 'PENDIENTE' 
                    });

                    const citasEnConflicto = citasActivas.filter(cita => {
                        const fechaCita = new Date(cita.fecha);
                        const diaCitaJS = fechaCita.getDay(); 
                        const diaTurnoDB = turno.dia_semana; 
                        const mapDbToJs = [1, 2, 3, 4, 5, 6, 0];
                        const coincideDia = mapDbToJs[diaTurnoDB] === diaCitaJS;
                        const coincideHora = cita.hora_inicio >= turno.hora_inicio && cita.hora_inicio < turno.hora_fin;
                        return coincideDia && coincideHora;
                    });

                    if (citasEnConflicto.length > 0) {
                        Swal.fire({
                            title: 'No se puede eliminar',
                            html: `<p>Existen <b>${citasEnConflicto.length} pacientes agendados</b> en este horario recurrente.</p>
                                   <div class="text-left text-xs bg-gray-100 p-2 mt-2 rounded">
                                     Ej: ${citasEnConflicto[0].fecha} - ${citasEnConflicto[0].paciente_nombre}
                                   </div>
                                   <p class="mt-2 text-sm">Debes cancelar o reprogramar esas citas primero.</p>`,
                            icon: 'error'
                        });
                    } else {
                        await agendaService.deleteDisponibilidad(idTurno);
                        Swal.fire('Eliminado', 'El horario ha sido removido correctamente.', 'success');
                        cargarMultiplesAgendas();
                    }

                } catch(e) { 
                    console.error(e);
                    Swal.fire('Error', 'No se pudo verificar la agenda. Intente nuevamente.', 'error'); 
                }
            }
        };

        Swal.fire({
            title: `Gestión: ${fechaPreseleccionada}`,
            html: `
                <div class="text-left bg-gray-50 p-4 rounded border border-gray-200">
                    <p class="text-xs text-gray-500 mb-2">
                        <b>${nombreServicio}</b> (${duracion} min)<br/>
                        Turno Base: ${turno.hora_inicio} - ${turno.hora_fin}
                    </p>
                    <div class="max-h-[300px] overflow-y-auto pr-1 custom-scroll">
                        ${slotsHtml}
                    </div>
                    <div class="mt-4 pt-2 border-t text-center">
                        <button onclick="window.eliminarTurnoBase(${turno.id})" class="text-xs text-red-500 hover:text-red-700 hover:underline font-bold flex items-center justify-center gap-1 mx-auto">
                            <i class="fas fa-trash"></i> Eliminar todo el horario recurrente
                        </button>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            width: '500px',
            didDestroy: () => { 
                delete window.gestionarSlot; 
                delete window.eliminarTurnoBase;
            }
        });
    };

    const resultadosFooter = footerSearch.length > 0 
        ? profesionales.filter(p => !selectedProfs.find(sel => sel.id === p.id) && p.nombre.toLowerCase().includes(footerSearch.toLowerCase()))
        : [];

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100 overflow-hidden relative">
            
            {/* SIDEBAR */}
            <div className="flex-shrink-0 z-30 h-full shadow-lg">
                <ListaProfesionales 
                    sedes={sedes} profesionales={profesionales}
                    sedeSeleccionada={sedeSeleccionada} setSedeSeleccionada={setSedeSeleccionada}
                    selectedProfs={selectedProfs} 
                    toggleProfesional={toggleProfesional} 
                    onOpenModal={() => setIsGridOpen(true)}
                />
            </div>
            
            {/* PANEL DERECHO */}
            <div className="flex-1 flex flex-col h-full bg-gray-50 relative overflow-hidden min-w-0">
                {viewMode === 'historial' ? (
                    <HistorialPanel selectedProfs={selectedProfs} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md border border-gray-100">
                            <FaUsers size={48} className="mx-auto mb-4 text-blue-200"/>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">Gestión de Agendas</h3>
                            <p className="mb-6 text-sm">Selecciona uno o varios profesionales.</p>
                            {selectedProfs.length > 0 ? (
                                <button onClick={() => setIsGridOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition font-bold flex items-center gap-2 mx-auto animate-pulse">
                                    <FaCalendarAlt /> Abrir Agenda ({selectedProfs.length})
                                </button>
                            ) : (
                                <div className="text-xs text-orange-400 bg-orange-50 p-2 rounded">← Selecciona un médico</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL FULL SCREEN (La Grilla) */}
            {isGridOpen && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fadeIn">
                    {/* Header */}
                    <div className="h-16 px-4 border-b flex items-center justify-between bg-white shadow-sm shrink-0 z-50">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsGridOpen(false)} className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full transition"><FaTimes size={20}/></button>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FaCalendarAlt className="text-blue-600"/> Agenda</h2>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="hidden lg:flex items-center gap-2 bg-gray-50 p-1 px-3 rounded-lg border border-gray-200">
                                <FaCogs className="text-gray-400"/>
                                <span className="text-xs font-bold text-gray-500">Intervalo:</span>
                                <input type="number" value={duracionDefecto} onChange={(e) => setDuracionDefecto(parseInt(e.target.value) || 20)} className="w-12 text-center text-sm font-bold bg-white border rounded outline-none"/>
                                <span className="text-xs text-gray-500">min</span>
                            </div>
                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <button onClick={() => navegarCalendario(-1)} className="p-1.5 hover:bg-white rounded text-gray-600"><FaChevronLeft/></button>
                                <button onClick={irAHoy} className="mx-1 px-3 py-1 text-sm font-bold text-gray-600 hover:bg-white rounded">Hoy</button>
                                <button onClick={() => navegarCalendario(1)} className="p-1.5 hover:bg-white rounded text-gray-600"><FaChevronRight/></button>
                            </div>
                            <span className="font-bold text-gray-700 capitalize w-32 text-center hidden md:block">{fechaReferencia.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['day','week','month'].map(v => (
                                    <button key={v} onClick={() => setCalendarView(v)} className={`px-3 py-1 rounded text-xs font-bold ${calendarView === v ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>{v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Contenido Grilla */}
                    <div className="flex-1 overflow-hidden relative bg-gray-50">
                        {loadingAgenda ? (
                            <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
                        ) : (
                            <GrillaSemanal 
                                selectedProfs={selectedProfs} agendasCombinadas={agendasCombinadas} servicios={servicios}
                                duracionDefecto={duracionDefecto} onCrearTurno={handleCrearTurno} onGestionarTurno={handleGestionarTurno}
                                calendarView={calendarView} fechaReferencia={fechaReferencia} setCalendarView={setCalendarView} setFechaReferencia={setFechaReferencia}
                            />
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="h-14 border-t bg-white flex items-center shrink-0 z-50">
                        <div className="flex-1 flex gap-3 overflow-x-auto p-2 scrollbar-thin items-center">
                            {selectedProfs.map(p => (
                                <div key={p.id} className={`px-2 py-1 rounded border flex items-center gap-2 shrink-0 ${p.colorInfo.clase} shadow-sm`}>
                                    <div className="w-2 h-2 rounded-full bg-current opacity-50"></div>
                                    <span className="font-bold truncate max-w-[150px] text-xs">{p.nombre}</span>
                                    <button onClick={() => toggleProfesional(p)} className="hover:bg-white/50 rounded-full p-0.5"><FaTimes size={10}/></button>
                                </div>
                            ))}
                        </div>
                        <div className="w-64 border-l pl-3 pr-3 py-2 bg-gray-50 relative h-full flex items-center group">
                            <FaSearch className="text-gray-400 mr-2 text-xs"/>
                            <input ref={footerInputRef} type="text" placeholder="Agregar otro médico..." className="w-full bg-transparent text-sm outline-none placeholder-gray-400 text-gray-700" value={footerSearch} onChange={(e) => { setFooterSearch(e.target.value); setShowFooterResults(true); }} onFocus={() => setShowFooterResults(true)}/>
                            {showFooterResults && footerSearch.length > 0 && (
                                <div className="absolute bottom-full right-0 left-0 mb-1 bg-white border border-gray-200 rounded-t-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                    {resultadosFooter.map(p => (
                                        <div key={p.id} className="p-2 hover:bg-blue-50 cursor-pointer border-b flex items-center justify-between group/item" onClick={() => toggleProfesional(p)}>
                                            <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">{p.nombre}</span><span className="text-[10px] text-gray-400">{p.especialidades_nombres?.[0]}</span></div>
                                            <FaPlusCircle className="text-gray-300 group-hover/item:text-blue-500"/>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {showFooterResults && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowFooterResults(false)}></div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionAgenda;