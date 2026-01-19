import React, { useState, useEffect } from 'react';
import { staffService } from '../../../services/staffService';
import { agendaService } from '../../../services/agendaService';
import Swal from 'sweetalert2';
import { FaCogs, FaCalendarAlt, FaHistory } from 'react-icons/fa';

// Sub-componentes
import ListaProfesionales from './ListaProfesionales';
import GrillaSemanal from './GrillaSemanal';
import HistorialPanel from '././HistorialAgendas'; 

const GestionAgenda = () => {
    // --- ESTADOS GENERALES ---
    const [sedes, setSedes] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [servicios, setServicios] = useState([]); 
    
    const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
    const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
    
    // --- ESTADOS DE AGENDA (CONFIGURACIÓN) ---
    const [agenda, setAgenda] = useState({ horarios: [], bloqueos: [] });
    const [loadingAgenda, setLoadingAgenda] = useState(false);
    const [duracionDefecto, setDuracionDefecto] = useState(20);

    // --- ESTADO DE VISTA (PESTAÑAS) ---
    const [viewMode, setViewMode] = useState('config'); // 'config' | 'historial'

    // Carga Inicial
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

    // Cargar Agenda solo si estamos en modo configuración
    useEffect(() => {
        if (profesionalSeleccionado && sedeSeleccionada && viewMode === 'config') {
            cargarAgendaMedico();
        }
    }, [profesionalSeleccionado, sedeSeleccionada, viewMode]);

    const cargarAgendaMedico = async () => {
        setLoadingAgenda(true);
        try {
            const [h, b] = await Promise.all([
                agendaService.getDisponibilidades({ profesional_id: profesionalSeleccionado.id, lugar_id: sedeSeleccionada }),
                agendaService.getBloqueos({ profesional_id: profesionalSeleccionado.id })
            ]);
            setAgenda({ horarios: h, bloqueos: b });
        } catch (error) { console.error(error); }
        finally { setLoadingAgenda(false); }
    };

    // --- LÓGICA DE GESTIÓN AVANZADA (MODAL SLOT) ---
    const handleGestionarTurno = async (turno) => {
        const { value: fechaGestion } = await Swal.fire({
            title: 'Gestionar Disponibilidad',
            text: 'Selecciona la fecha para ver/bloquear espacios:',
            input: 'date',
            inputValue: new Date().toISOString().split('T')[0],
            showCancelButton: true,
            confirmButtonText: 'Ver Agenda del Día'
        });

        if (!fechaGestion) return;

        // Determinar duración
        let duracion = duracionDefecto;
        let nombreServicio = "General / Mixto";
        if (turno.servicio_id) {
            const s = servicios.find(srv => srv.id === turno.servicio_id);
            if (s) { duracion = s.duracion_minutos; nombreServicio = s.nombre; }
        }

        // Consultar bloqueos frescos
        let bloqueosFrescos = [];
        try {
            bloqueosFrescos = await agendaService.getBloqueos({ profesional_id: profesionalSeleccionado.id });
        } catch(e) { console.error(e); }

        // Calcular Slots
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
            
            // Match Bloqueo
            const bloqueoMatch = bloqueosFrescos.find(b => {
                // Comparación simple de string (Mejorar en prod con moment/date-fns)
                return b.fecha_inicio.includes(fechaGestion) && b.fecha_inicio.includes(`T${inicioStr}`);
            });

            // Match Pasado
            const slotDate = new Date(`${fechaGestion}T${inicioStr}:00`);
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

        // Renderizar HTML
        const slotsHtml = slots.map(slot => {
            let style = "bg-white border-gray-200";
            let btn = "";
            let extra = "";

            if (slot.esPasado) {
                style = "bg-gray-100 border-gray-300 opacity-60";
                btn = `<span class="text-xs text-gray-500 font-bold">Pasado</span>`;
            } else if (slot.bloqueado) {
                style = "bg-red-50 border-red-300";
                extra = `<div class="text-[10px] text-red-600 italic truncate w-32">${slot.motivo}</div>`;
                btn = `<button onclick="window.gestionarSlot('DESBLOQUEAR', null, null, '${slot.bloqueoId}')" class="text-xs bg-white text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-100 font-bold shadow-sm">Desbloquear</button>`;
            } else {
                btn = `<button onclick="window.gestionarSlot('BLOQUEAR', '${slot.inicio}', '${slot.fin}', null)" class="text-xs bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded hover:bg-red-200 font-bold">Bloquear</button>`;
            }

            return `
                <div class="flex justify-between items-center p-2 mb-2 rounded border ${style}">
                    <div class="flex items-center gap-2">
                        <span class="font-mono text-sm font-bold text-gray-700">${slot.inicio} - ${slot.fin}</span>
                        ${extra}
                    </div>
                    ${btn}
                </div>
            `;
        }).join('');

        // Exponer función global
        window.gestionarSlot = async (accion, inicio, fin, bloqueoId) => {
            if (accion === 'BLOQUEAR') {
                const { value: motivo } = await Swal.fire({
                    title: `Bloquear ${inicio}`, input: 'text', inputPlaceholder: 'Motivo', showCancelButton: true
                });
                if (motivo) {
                    try {
                        await agendaService.createBloqueo({
                            profesional_id: profesionalSeleccionado.id,
                            fecha_inicio: `${fechaGestion}T${inicio}:00`,
                            fecha_fin: `${fechaGestion}T${fin}:00`,
                            motivo: motivo
                        });
                        handleGestionarTurno(turno); // Reload
                    } catch (e) { Swal.fire('Error', 'Fallo al bloquear', 'error'); }
                } else { handleGestionarTurno(turno); }
            } 
            if (accion === 'DESBLOQUEAR') {
                try {
                    await agendaService.deleteBloqueo(bloqueoId);
                    handleGestionarTurno(turno); // Reload
                } catch (e) { Swal.fire('Error', 'Fallo al desbloquear', 'error'); }
            }
        };

        Swal.fire({
            title: `Agenda: ${fechaGestion}`,
            html: `
                <div class="text-left bg-gray-50 p-4 rounded border border-gray-200">
                    <p class="text-xs text-gray-500 mb-3 flex justify-between">
                        <span><b>Servicio:</b> ${nombreServicio}</span>
                        <span><b>Intervalo:</b> ${duracion} min</span>
                    </p>
                    <div class="max-h-[300px] overflow-y-auto pr-1 custom-scroll">${slotsHtml}</div>
                </div>
            `,
            showConfirmButton: false, showCloseButton: true, width: '500px',
            didDestroy: () => { delete window.gestionarSlot; }
        });
    };

    const handleCrearTurno = async (diaIndex, hora) => {
        const horaInicio = `${hora.toString().padStart(2, '0')}:00`;
        const horaFin = `${(hora+1).toString().padStart(2, '0')}:00`;
        const diaNombre = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][diaIndex];
        
        const opcionesServicios = servicios.map(s => 
            `<option value="${s.id}">${s.nombre} (${s.duracion_minutos} min)</option>`
        ).join('');

        const { value: formValues } = await Swal.fire({
            title: `Nuevo Turno: ${diaNombre}`,
            html: `
                <div class="text-left">
                    <label class="block text-sm font-bold text-gray-700">Horario</label>
                    <div class="flex gap-2 mb-3">
                        <input id="swal-inicio" type="time" class="swal2-input" value="${horaInicio}" style="margin:0">
                        <input id="swal-fin" type="time" class="swal2-input" value="${horaFin}" style="margin:0">
                    </div>
                    <label class="block text-sm font-bold text-gray-700">Enfoque</label>
                    <select id="swal-servicio" class="swal2-select" style="margin:0; width:100%">
                        <option value="">General / Mixto (Usa valor paramétrico: ${duracionDefecto} min)</option>
                        ${opcionesServicios}
                    </select>
                </div>
            `,
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
                    profesional_id: profesionalSeleccionado.id,
                    lugar_id: sedeSeleccionada,
                    dia_semana: diaIndex,
                    hora_inicio: formValues.inicio,
                    hora_fin: formValues.fin,
                    servicio_id: formValues.servicio || null
                });
                cargarAgendaMedico();
                Swal.fire('Guardado', '', 'success');
            } catch (e) { Swal.fire('Error', 'Verifica solapamientos', 'error'); }
        }
    };

    return (
        <div className="max-w-full h-screen flex flex-col md:flex-row bg-gray-100 overflow-hidden">
            
            {/* PANEL IZQUIERDO (Lista Médicos) */}
            <ListaProfesionales 
                sedes={sedes} 
                profesionales={profesionales}
                sedeSeleccionada={sedeSeleccionada}
                setSedeSeleccionada={setSedeSeleccionada}
                profesionalSeleccionado={profesionalSeleccionado}
                setProfesionalSeleccionado={setProfesionalSeleccionado}
            />
            
            {/* PANEL DERECHO (Contenido Dinámico) */}
            <div className="flex-1 flex flex-col h-full bg-white">
                
                {/* HEADER CON TABS */}
                <div className="bg-white border-b px-4 h-14 flex items-center justify-between shadow-sm z-20">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('config')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                                viewMode === 'config' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <FaCalendarAlt/> Configurar Agenda
                        </button>
                        <button 
                            onClick={() => setViewMode('historial')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                                viewMode === 'historial' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <FaHistory/> Ver Historial
                        </button>
                    </div>

                    {viewMode === 'config' && (
                        <div className="flex items-center gap-2 text-gray-600 text-xs">
                            <FaCogs className="text-gray-400"/>
                            <span className="font-bold hidden md:inline">Intervalo Mixto:</span>
                            <input 
                                type="number" min="10" max="60" step="5"
                                value={duracionDefecto}
                                onChange={(e) => setDuracionDefecto(parseInt(e.target.value) || 20)}
                                className="border rounded w-12 px-1 py-1 text-center font-bold text-blue-600 focus:outline-none"
                            />
                            <span className="hidden md:inline text-gray-400">min</span>
                        </div>
                    )}
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div className="flex-1 overflow-hidden relative">
                    {viewMode === 'config' ? (
                        <GrillaSemanal 
                            profesional={profesionalSeleccionado}
                            agenda={agenda}
                            servicios={servicios}
                            duracionDefecto={duracionDefecto}
                            onCrearTurno={handleCrearTurno}
                            onGestionarTurno={handleGestionarTurno}
                        />
                    ) : (
                        // AQUÍ SE RENDERIZA EL NUEVO COMPONENTE
                        <HistorialPanel 
                            profesionalSeleccionado={profesionalSeleccionado}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default GestionAgenda;