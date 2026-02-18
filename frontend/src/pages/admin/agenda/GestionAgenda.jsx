import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffService } from '../../../services/staffService';
import { agendaService } from '../../../services/agendaService';
import Swal from 'sweetalert2';
import {
    FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes,
    FaUsers, FaSearch, FaPlusCircle, FaCogs, FaHistory, FaPaste
} from 'react-icons/fa';

import ListaProfesionales from './ListaProfesionales';
import GrillaSemanal from './GrillaSemanal';
import HistorialPanel from './HistorialAgendas';

const PALETA_COLORES = [
    { nombre: 'blue', clase: 'bg-blue-100 text-blue-800 border-blue-300' },
    { nombre: 'green', clase: 'bg-green-100 text-green-800 border-green-300' },
    { nombre: 'purple', clase: 'bg-purple-100 text-purple-800 border-purple-300' },
    { nombre: 'orange', clase: 'bg-orange-100 text-orange-800 border-orange-300' },
    { nombre: 'pink', clase: 'bg-pink-100 text-pink-800 border-pink-300' },
    { nombre: 'teal', clase: 'bg-teal-100 text-teal-800 border-teal-300' },
];

// ✅ RUTA REAL SEGÚN App.jsx
const EXPRESS_AGENDAR_ROUTE = '/dashboard/agendar-admin';

const GestionAgenda = () => {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [sedes, setSedes] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
    const [selectedProfs, setSelectedProfs] = useState([]);
    const [agendasCombinadas, setAgendasCombinadas] = useState({});
    const [loadingAgenda, setLoadingAgenda] = useState(false);
    const [duracionDefecto, setDuracionDefecto] = useState(20);
    const [viewMode, setViewMode] = useState('config');
    const [calendarView, setCalendarView] = useState('week');
    const [fechaReferencia, setFechaReferencia] = useState(new Date());
    const [isGridOpen, setIsGridOpen] = useState(false);
    const [footerSearch, setFooterSearch] = useState('');
    const [showFooterResults, setShowFooterResults] = useState(false);

    // --- NUEVO: ESTADO PARA CLONADO DE DÍAS ---
    const [clipboardDay, setClipboardDay] = useState(null); // { date: Date, profId: int }

    const footerInputRef = useRef(null);

    // Helper: leer param de URL
    const getQueryParam = (key) => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get(key);
        } catch {
            return null;
        }
    };

    // Helper: set param de URL sin recargar
    const setQueryParam = (key, value) => {
        try {
            const url = new URL(window.location.href);
            if (value === null || value === undefined || value === '') url.searchParams.delete(key);
            else url.searchParams.set(key, String(value));
            window.history.replaceState({}, '', url.toString());
        } catch {
            // ignore
        }
    };

    // 1. CARGA INICIAL DE PARAMÉTRICAS + SINCRONIZACIÓN DE SEDE POR URL (Fase 3)
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

                const sedeURL = getQueryParam('sede'); // <--- Sede por URL
                const sedeURLNum = sedeURL ? parseInt(sedeURL) : null;

                if (sedeURLNum && dataSedes.some(s => s.id === sedeURLNum)) {
                    setSedeSeleccionada(sedeURLNum);
                } else if (dataSedes.length > 0) {
                    setSedeSeleccionada(dataSedes[0].id);
                    // dejamos la URL consistente
                    setQueryParam('sede', dataSedes[0].id);
                }
            } catch (error) {
                console.error(error);
            }
        };
        cargarDatos();
    }, []);

    // Mantener URL actualizada cuando cambia sedeSeleccionada
    useEffect(() => {
        if (sedeSeleccionada) setQueryParam('sede', sedeSeleccionada);
    }, [sedeSeleccionada]);

    const getColorForId = (id) => {
        const index = id % PALETA_COLORES.length;
        return PALETA_COLORES[index];
    };

    const toggleProfesional = (prof) => {
        const isSelected = selectedProfs.some(p => p.id === prof.id);
        if (isSelected) {
            setSelectedProfs(prev => prev.filter(p => p.id !== prof.id));
        } else {
            if (viewMode === 'historial') {
                setSelectedProfs([{ ...prof, colorInfo: getColorForId(prof.id) }]);
            } else {
                const nuevoProf = { ...prof, colorInfo: getColorForId(prof.id) };
                setSelectedProfs(prev => [...prev, nuevoProf]);
            }
        }
        setFooterSearch('');
        setShowFooterResults(false);
    };

    const cargarMultiplesAgendas = useCallback(async () => {
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
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingAgenda(false);
        }
    }, [selectedProfs, sedeSeleccionada]);

    useEffect(() => {
        if (selectedProfs.length > 0 && sedeSeleccionada && viewMode === 'config') {
            cargarMultiplesAgendas();
        } else {
            setAgendasCombinadas({});
        }
    }, [selectedProfs, sedeSeleccionada, viewMode, cargarMultiplesAgendas]);

    const navegarCalendario = (direccion) => {
        const nuevaFecha = new Date(fechaReferencia);
        if (calendarView === 'day') nuevaFecha.setDate(nuevaFecha.getDate() + direccion);
        else if (calendarView === 'week') nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7));
        else if (calendarView === 'month') nuevaFecha.setMonth(nuevaFecha.getMonth() + direccion);
        setFechaReferencia(nuevaFecha);
    };

    const irAHoy = () => setFechaReferencia(new Date());

    // --- NUEVO: LÓGICA DE COPIAR / PEGAR DÍAS ---
    const handleCopySchedule = (fechaOrigen) => {
        if (selectedProfs.length !== 1) {
            return Swal.fire('Atención', 'Selecciona un solo médico para usar la función de copiar/pegar.', 'warning');
        }

        setClipboardDay({
            date: fechaOrigen,
            profId: selectedProfs[0].id,
            profNombre: selectedProfs[0].nombre
        });

        const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 3000 });
        Toast.fire({ icon: 'info', title: 'Día copiado. Haz clic en "Pegar" en otro día.' });
    };

    const handlePasteSchedule = async (fechaDestino) => {
        if (!clipboardDay) return;

        try {
            const fechaOrigenStr = clipboardDay.date.toISOString().split('T')[0];
            const fechaDestinoStr = fechaDestino.toISOString().split('T')[0];

            const { isConfirmed } = await Swal.fire({
                title: '¿Pegar programación?',
                html: `Se copiarán los turnos del <b>${fechaOrigenStr}</b> al <b>${fechaDestinoStr}</b> para el Dr/a. ${clipboardDay.profNombre}.`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, pegar',
                confirmButtonColor: '#10B981'
            });

            if (isConfirmed) {
                setLoadingAgenda(true);
                await agendaService.duplicateSchedule({
                    profesional_id: clipboardDay.profId,
                    lugar_id: sedeSeleccionada,
                    fecha_origen: fechaOrigenStr,
                    fecha_destino: fechaDestinoStr
                });

                setClipboardDay(null);
                cargarMultiplesAgendas();

                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Programación duplicada con éxito', timer: 2000, showConfirmButton: false });
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo duplicar la agenda. Verifica que el destino esté libre.', 'error');
        } finally {
            setLoadingAgenda(false);
        }
    };

    const handleCancelPaste = () => {
        setClipboardDay(null);
        const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'info', title: 'Copiado cancelado' });
    };

    // --- GESTIÓN DE TURNOS ---
    const handleCrearTurno = async (fechaColumnaObj, hora) => {
        let targetProfId = null;

        const formatLocalISO = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const diaNombre = fechaColumnaObj.toLocaleDateString('es-ES', { weekday: 'long' });
        const diaNombreCap = diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1);
        const fechaStr = fechaColumnaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        const jsDay = fechaColumnaObj.getDay();
        const diaIndexBD = jsDay === 0 ? 6 : jsDay - 1;

        if (selectedProfs.length > 1) {
            const inputOptions = {};
            selectedProfs.forEach(p => { inputOptions[p.id] = p.nombre; });
            const { value: profId } = await Swal.fire({
                title: 'Seleccione Profesional',
                text: `Crear horario para el ${diaNombre} (${hora}:00)`,
                input: 'select', inputOptions: inputOptions,
                showCancelButton: true, confirmButtonText: 'Continuar'
            });
            if (!profId) return;
            targetProfId = profId;
        } else if (selectedProfs.length === 1) {
            targetProfId = selectedProfs[0].id;
        } else { return; }

        const profesionalObj = profesionales.find(p => p.id === parseInt(targetProfId));
        const serviciosFiltrados = servicios.filter(s => profesionalObj?.servicios_habilitados?.includes(s.id));

        const opcionesServicios = serviciosFiltrados.length > 0
            ? serviciosFiltrados.map(s => `<option value="${s.id}">${s.nombre} (${s.duracion_minutos} min)</option>`).join('')
            : '<option value="" disabled>El profesional no tiene servicios habilitados</option>';

        const horaInicio = `${hora.toString().padStart(2, '0')}:00`;
        const horaFin = `${(hora + 1).toString().padStart(2, '0')}:00`;

        const { value: formValues } = await Swal.fire({
            title: `<span class="text-xl font-bold text-gray-800">Nuevo Turno</span>`,
            html: `
                <div class="text-left px-2">
                    <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 flex items-center gap-3">
                        <div class="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold">
                            ${profesionalObj?.nombre.charAt(0)}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-blue-900">${profesionalObj?.nombre}</p>
                            <p class="text-xs text-blue-600">${diaNombreCap}, ${fechaStr}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Inicio</label>
                            <input id="swal-inicio" type="time" class="w-full p-2 border rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value="${horaInicio}">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Fin</label>
                            <input id="swal-fin" type="time" class="w-full p-2 border rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value="${horaFin}">
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Servicio</label>
                        <select id="swal-servicio" class="w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">General / Mixto (${duracionDefecto} min)</option>
                            ${opcionesServicios}
                        </select>
                    </div>

                    <div class="mb-2">
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Repetición</label>
                        <select id="swal-recurrencia" class="w-full p-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="HOY" selected>Solo por hoy (${fechaStr})</option>
                            <option value="INDEFINIDO">Indefinidamente (Todos los ${diaNombre}s)</option>
                            <option value="1_SEMANA">Por 1 Semana (2 veces)</option>
                            <option value="15_DIAS">Por 15 Días (3 veces)</option>
                            <option value="1_MES">Por 1 Mes (4-5 veces)</option>
                        </select>
                        <p class="text-[10px] text-gray-400 mt-1 text-center">Define hasta cuándo estará vigente este horario.</p>
                    </div>
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'Crear Horario',
            confirmButtonColor: '#2563EB',
            cancelButtonText: 'Cancelar',
            width: '400px',
            focusConfirm: false,
            preConfirm: () => ({
                inicio: document.getElementById('swal-inicio').value,
                fin: document.getElementById('swal-fin').value,
                servicio: document.getElementById('swal-servicio').value,
                recurrencia: document.getElementById('swal-recurrencia').value
            })
        });

        if (formValues) {
            try {
                const fechaBase = new Date(fechaColumnaObj);
                let fechaFinVigencia = null;

                if (formValues.recurrencia === 'HOY') {
                    fechaFinVigencia = new Date(fechaBase);
                } else if (formValues.recurrencia === '1_SEMANA') {
                    fechaFinVigencia = new Date(fechaBase);
                    fechaFinVigencia.setDate(fechaFinVigencia.getDate() + 7);
                } else if (formValues.recurrencia === '15_DIAS') {
                    fechaFinVigencia = new Date(fechaBase);
                    fechaFinVigencia.setDate(fechaFinVigencia.getDate() + 15);
                } else if (formValues.recurrencia === '1_MES') {
                    fechaFinVigencia = new Date(fechaBase);
                    fechaFinVigencia.setMonth(fechaFinVigencia.getMonth() + 1);
                }

                const payload = {
                    profesional_id: targetProfId,
                    lugar_id: sedeSeleccionada,
                    dia_semana: diaIndexBD,
                    hora_inicio: formValues.inicio,
                    hora_fin: formValues.fin,
                    servicio_id: formValues.servicio || null,
                    fecha_inicio_vigencia: formatLocalISO(fechaBase),
                    fecha_fin_vigencia: fechaFinVigencia ? formatLocalISO(fechaFinVigencia) : null
                };

                await agendaService.createDisponibilidad(payload);
                cargarMultiplesAgendas();
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Horario creado', showConfirmButton: false, timer: 1500 });
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'No se pudo crear el horario.', 'error');
            }
        }
    };

    // --- ✅ HU01: Abrir AgendarCitaAdmin (Express) desde grilla ---
    // Recibe: { profId, fecha, hora }
    const handleAgendarExpress = ({ profId, fecha, hora }) => {
        if (!profId || !fecha || !hora) return;

        const sede = sedeSeleccionada || getQueryParam('sede');

        const params = new URLSearchParams();
        params.set('prof', String(profId));
        params.set('fecha', String(fecha));
        params.set('hora', String(hora));
        if (sede) params.set('sede', String(sede));

        navigate(`${EXPRESS_AGENDAR_ROUTE}?${params.toString()}`);
    };

    // --- ✅ NUEVO: Bloqueo rápido desde la grilla (click) ---
    // Recibe: { profId, fecha, inicio, fin, motivo }
    const handleBloquearSlotRapido = async ({ profId, fecha, inicio, fin, motivo }) => {
        if (!profId || !fecha || !inicio || !fin) return;

        try {
            await agendaService.createBloqueo({
                profesional_id: profId,
                fecha_inicio: `${fecha}T${inicio}:00`,
                fecha_fin: `${fecha}T${fin}:00`,
                motivo: motivo || 'Bloqueo desde grilla'
            });

            await cargarMultiplesAgendas();

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Bloqueo creado',
                timer: 1800,
                showConfirmButton: false
            });
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo bloquear el espacio.', 'error');
        }
    };

    // --- GESTIÓN DE TURNOS (modal) ---
    const handleGestionarTurno = async (turno, fechaPreseleccionada) => {
        let duracion = duracionDefecto;
        let buffer = 0;
        let nombreServicio = "General / Mixto";

        if (turno.servicio_id) {
            const s = servicios.find(srv => srv.id === turno.servicio_id);
            if (s) {
                duracion = s.duracion_minutos;
                buffer = s.buffer_minutos || 0;
                nombreServicio = s.nombre;
            }
        }

        const paso = duracion + buffer;

        let bloqueosFrescos = [];
        try {
            bloqueosFrescos = await agendaService.getBloqueos({ profesional_id: turno.profesional_id });
        } catch (e) {
            console.error(e);
        }

        const slots = [];
        let [h, m] = turno.hora_inicio.split(':').map(Number);
        const [hFin, mFin] = turno.hora_fin.split(':').map(Number);
        let actualMin = h * 60 + m;
        const finMin = hFin * 60 + mFin;
        const ahora = new Date();

        while (actualMin + duracion <= finMin) {
            const inicioHH = Math.floor(actualMin / 60).toString().padStart(2, '0');
            const inicioMM = (actualMin % 60).toString().padStart(2, '0');
            const inicioStr = `${inicioHH}:${inicioMM}`;

            const finPacienteMin = actualMin + duracion;
            const finRealMin = actualMin + paso;

            const finPacienteHH = Math.floor(finPacienteMin / 60).toString().padStart(2, '0');
            const finPacienteMM = (finPacienteMin % 60).toString().padStart(2, '0');
            const finPacienteStr = `${finPacienteHH}:${finPacienteMM}`;

            const finRealHH = Math.floor(finRealMin / 60).toString().padStart(2, '0');
            const finRealMM = (finRealMin % 60).toString().padStart(2, '0');
            const finRealStr = `${finRealHH}:${finRealMM}`;

            const slotStart = new Date(`${fechaPreseleccionada}T${inicioStr}:00`);

            const bloqueoMatch = bloqueosFrescos.find(b => {
                const bStart = new Date(b.fecha_inicio);
                const bEnd = new Date(b.fecha_fin);
                const slotEndReal = new Date(`${fechaPreseleccionada}T${finRealStr}:00`);
                return (slotStart < bEnd) && (slotEndReal > bStart);
            });

            slots.push({
                inicio: inicioStr,
                finPaciente: finPacienteStr,
                finReal: finRealStr,
                bloqueado: !!bloqueoMatch,
                bloqueoId: bloqueoMatch?.id,
                motivo: bloqueoMatch?.motivo,
                esPasado: slotStart < ahora
            });

            actualMin += paso;
        }

        const slotsHtml = slots.map(slot => {
            let btnAction = '';
            let info = '';

            const etiquetaFin = buffer > 0
                ? `<span class="text-[10px] text-gray-400 block">Paciente: ${slot.inicio} - ${slot.finPaciente} • Buffer hasta ${slot.finReal}</span>`
                : `<span class="text-[10px] text-gray-400 block">${slot.inicio} - ${slot.finPaciente}</span>`;

            if (slot.esPasado) {
                btnAction = '<span class="text-xs text-gray-400 font-bold">Pasado</span>';
            } else if (slot.bloqueado) {
                info = `<span class="text-[10px] text-red-600 block italic">🔒 ${slot.motivo || 'Bloqueado'}</span>`;
                btnAction = `<button onclick="window.gestionarSlot('DESBLOQUEAR', null, null, '${slot.bloqueoId}')" class="text-xs bg-white text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">Desbloquear</button>`;
            } else {
                btnAction = `<button onclick="window.gestionarSlot('BLOQUEAR', '${slot.inicio}', '${slot.finReal}', null)" class="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100">Bloquear</button>`;
            }

            return `
                <div class="flex justify-between items-center p-2 mb-1 rounded border ${slot.bloqueado ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}">
                    <div>
                        <span class="font-mono text-sm font-bold text-gray-700">${slot.inicio} - ${slot.finPaciente}</span>
                        ${etiquetaFin}
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
                    showCancelButton: true
                });
                if (motivo) {
                    await agendaService.createBloqueo({
                        profesional_id: turno.profesional_id,
                        fecha_inicio: `${fechaPreseleccionada}T${inicio}:00`,
                        fecha_fin: `${fechaPreseleccionada}T${fin}:00`,
                        motivo
                    });
                    await cargarMultiplesAgendas();
                    handleGestionarTurno(turno, fechaPreseleccionada);
                }
            }
            if (accion === 'DESBLOQUEAR') {
                await agendaService.deleteBloqueo(bloqueoId);
                await cargarMultiplesAgendas();
                handleGestionarTurno(turno, fechaPreseleccionada);
            }
        };

        window.eliminarTurnoBase = async (idTurno) => {
            Swal.close();
            const { value: opcion } = await Swal.fire({
                title: 'Eliminar Horario',
                text: '¿Qué deseas eliminar?',
                icon: 'question',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Toda la Serie',
                denyButtonText: 'Solo este día',
                confirmButtonColor: '#d33',
                denyButtonColor: '#f59e0b'
            });

            try {
                if (opcion === true) {
                    const resp = await agendaService.deleteRecurrencia({
                        profesional_id: turno.profesional_id,
                        dia_semana: turno.dia_semana,
                        hora_inicio: turno.hora_inicio,
                        hora_fin: turno.hora_fin
                    });

                    await Swal.fire({
                        title: 'Resultado de Eliminación',
                        text: resp.mensaje,
                        icon: resp.conservados > 0 ? 'warning' : 'success'
                    });

                } else if (opcion === false) {
                    await agendaService.deleteDisponibilidad(idTurno);
                    Swal.fire('Eliminado', 'Se ha borrado solo este día', 'success');
                }
                cargarMultiplesAgendas();
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'No se pudo eliminar. Verifica si hay pacientes.', 'error');
            }
        };

        Swal.fire({
            title: `Gestión: ${fechaPreseleccionada}`,
            html: `
                <div class="text-left bg-gray-50 p-4 rounded border border-gray-200">
                    <p class="text-xs text-gray-500 mb-2">
                        <b>${nombreServicio}</b>
                        (${duracion} min${buffer ? ` + ${buffer} min buffer` : ''})
                        <br/>Base: ${turno.hora_inicio} - ${turno.hora_fin}
                    </p>
                    <div class="max-h-[300px] overflow-y-auto pr-1 custom-scroll">${slotsHtml}</div>
                    <div class="mt-4 pt-2 border-t text-center">
                        <button onclick="window.eliminarTurnoBase(${turno.id})" class="text-xs text-red-500 hover:underline font-bold">
                            <i class="fas fa-trash"></i> Eliminar Horario
                        </button>
                    </div>
                </div>`,
            showConfirmButton: false,
            showCloseButton: true,
            width: '500px',
            didDestroy: () => { delete window.gestionarSlot; delete window.eliminarTurnoBase; }
        });
    };

    const resultadosFooter = footerSearch.length > 0
        ? profesionales.filter(p => !selectedProfs.find(sel => sel.id === p.id) && p.nombre.toLowerCase().includes(footerSearch.toLowerCase()))
        : [];

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100 overflow-hidden relative">
            <div className="flex-shrink-0 z-30 h-full shadow-lg">
                <ListaProfesionales
                    sedes={sedes}
                    profesionales={profesionales}
                    sedeSeleccionada={sedeSeleccionada}
                    setSedeSeleccionada={setSedeSeleccionada}
                    selectedProfs={selectedProfs}
                    toggleProfesional={toggleProfesional}
                    onOpenModal={() => setIsGridOpen(true)}
                />
            </div>

            <div className="flex-1 flex flex-col h-full bg-gray-50 relative overflow-hidden min-w-0">
                <div className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800">{viewMode === 'config' ? 'Planificación de Horarios' : 'Historial de Atención'}</h2>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('config')}
                            className={`px-4 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition ${viewMode === 'config' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <FaCalendarAlt /> Planificación
                        </button>
                        <button
                            onClick={() => setViewMode('historial')}
                            className={`px-4 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition ${viewMode === 'historial' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <FaHistory /> Historial
                        </button>
                    </div>
                </div>

                {viewMode === 'historial' ? (
                    <HistorialPanel profesionalSeleccionado={selectedProfs[0]} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md border border-gray-100">
                            <FaUsers size={48} className="mx-auto mb-4 text-blue-200" />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">Gestión de Agendas</h3>
                            <p className="mb-6 text-sm text-gray-500">
                                {selectedProfs.length > 0
                                    ? `Gestionando agenda de: ${selectedProfs.map(p => p.nombre).join(', ')}`
                                    : "Selecciona profesionales del menú izquierdo."}
                            </p>
                            {selectedProfs.length > 0 ? (
                                <button
                                    onClick={() => setIsGridOpen(true)}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition font-bold flex items-center gap-2 mx-auto animate-pulse"
                                >
                                    <FaCalendarAlt /> Abrir Calendario Semanal
                                </button>
                            ) : (
                                <div className="text-xs text-orange-400 bg-orange-50 p-2 rounded">← Selecciona un médico para empezar</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isGridOpen && viewMode === 'config' && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fadeIn">
                    <div className="h-16 px-4 border-b flex items-center justify-between bg-white shadow-sm shrink-0 z-50">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsGridOpen(false)} className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full transition">
                                <FaTimes size={20} />
                            </button>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FaCalendarAlt className="text-blue-600" /> Agenda Semanal
                            </h2>

                            {clipboardDay && (
                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200 text-xs font-bold animate-bounce">
                                    <FaPaste /> Pegando día: {clipboardDay.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                                    <button onClick={handleCancelPaste} className="ml-2 hover:text-red-500"><FaTimes /></button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="hidden lg:flex items-center gap-2 bg-gray-50 p-1 px-3 rounded-lg border border-gray-200">
                                <FaCogs className="text-gray-400" />
                                <span className="text-xs font-bold text-gray-500">Intervalo Vista:</span>
                                <input
                                    type="number"
                                    value={duracionDefecto}
                                    onChange={(e) => setDuracionDefecto(parseInt(e.target.value) || 20)}
                                    className="w-12 text-center text-sm font-bold bg-white border rounded outline-none"
                                />
                                <span className="text-xs text-gray-500">min</span>
                            </div>

                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <button onClick={() => navegarCalendario(-1)} className="p-1.5 hover:bg-white rounded text-gray-600"><FaChevronLeft /></button>
                                <button onClick={irAHoy} className="mx-1 px-3 py-1 text-sm font-bold text-gray-600 hover:bg-white rounded">Hoy</button>
                                <button onClick={() => navegarCalendario(1)} className="p-1.5 hover:bg-white rounded text-gray-600"><FaChevronRight /></button>
                            </div>

                            <span className="font-bold text-gray-700 capitalize w-32 text-center hidden md:block">
                                {fechaReferencia.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>

                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['day', 'week', 'month'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setCalendarView(v)}
                                        className={`px-3 py-1 rounded text-xs font-bold ${calendarView === v ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                    >
                                        {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

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
                                onCopyDay={handleCopySchedule}
                                onPasteDay={handlePasteSchedule}
                                clipboardDay={clipboardDay}
                                refreshAgenda={cargarMultiplesAgendas}
                                onAgendarExpress={handleAgendarExpress}
                                // ✅ nuevo callback para bloqueo inmediato desde click
                                onBloquearSlotRapido={handleBloquearSlotRapido}
                            />
                        )}
                    </div>

                    {/* Footer de médicos seleccionados */}
                    <div className="h-14 border-t bg-white flex items-center shrink-0 z-50">
                        <div className="flex-1 flex gap-3 overflow-x-auto p-2 scrollbar-thin items-center">
                            {selectedProfs.map(p => (
                                <div key={p.id} className={`px-2 py-1 rounded border flex items-center gap-2 shrink-0 ${p.colorInfo.clase} shadow-sm`}>
                                    <div className="w-2 h-2 rounded-full bg-current opacity-50"></div>
                                    <span className="font-bold truncate max-w-[150px] text-xs">{p.nombre}</span>
                                    <button onClick={() => toggleProfesional(p)} className="hover:bg-white/50 rounded-full p-0.5">
                                        <FaTimes size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="w-64 border-l pl-3 pr-3 py-2 bg-gray-50 relative h-full flex items-center group">
                            <FaSearch className="text-gray-400 mr-2 text-xs" />
                            <input
                                ref={footerInputRef}
                                type="text"
                                placeholder="Agregar otro médico..."
                                className="w-full bg-transparent text-sm outline-none placeholder-gray-400 text-gray-700"
                                value={footerSearch}
                                onChange={(e) => { setFooterSearch(e.target.value); setShowFooterResults(true); }}
                                onFocus={() => setShowFooterResults(true)}
                            />

                            {showFooterResults && footerSearch.length > 0 && (
                                <div className="absolute bottom-full right-0 left-0 mb-1 bg-white border border-gray-200 rounded-t-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                    {resultadosFooter.map(p => (
                                        <div
                                            key={p.id}
                                            className="p-2 hover:bg-blue-50 cursor-pointer border-b flex items-center justify-between group/item"
                                            onClick={() => toggleProfesional(p)}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-700">{p.nombre}</span>
                                                <span className="text-[10px] text-gray-400">{p.especialidades_nombres?.[0]}</span>
                                            </div>
                                            <FaPlusCircle className="text-gray-300 group-hover/item:text-blue-500" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showFooterResults && (
                                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowFooterResults(false)}></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionAgenda;
