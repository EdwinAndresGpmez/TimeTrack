import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { staffService } from '../../../services/staffService';
import { agendaService } from '../../../services/agendaService';
import { citasService } from '../../../services/citasService';
import Swal from 'sweetalert2';
import { 
    FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes, 
    FaUsers, FaSearch, FaPlusCircle, FaCogs, FaHistory, FaPaste, FaClock, FaFileExport
} from 'react-icons/fa';

import ListaProfesionales from './ListaProfesionales';
import GrillaSemanal from './GrillaSemanal';
import HistorialPanel from './HistorialAgendas'; 
import useTenantPolicy from '../../../hooks/useTenantPolicy';

const PALETA_COLORES = [
    { nombre: '#2563eb', clase: 'bg-blue-100 text-blue-800 border-blue-300' },
    { nombre: '#059669', clase: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { nombre: '#7c3aed', clase: 'bg-violet-100 text-violet-800 border-violet-300' },
    { nombre: '#ea580c', clase: 'bg-orange-100 text-orange-800 border-orange-300' },
    { nombre: '#db2777', clase: 'bg-pink-100 text-pink-800 border-pink-300' },
    { nombre: '#0f766e', clase: 'bg-teal-100 text-teal-800 border-teal-300' },
    { nombre: '#4f46e5', clase: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { nombre: '#0891b2', clase: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
    { nombre: '#65a30d', clase: 'bg-lime-100 text-lime-800 border-lime-300' },
    { nombre: '#b91c1c', clase: 'bg-red-100 text-red-800 border-red-300' },
    { nombre: '#a16207', clase: 'bg-amber-100 text-amber-800 border-amber-300' },
    { nombre: '#64748b', clase: 'bg-slate-100 text-slate-800 border-slate-300' },
];

const getErrorMessage = (error, fallback = 'Ocurrio un error inesperado.') => {
    const data = error?.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (Array.isArray(data.detalle) && data.detalle.length > 0) {
        const resumen = data.detalle.slice(0, 3).join(', ');
        return data.error ? `${data.error} (${resumen})` : resumen;
    }
    if (data.detalle) return data.detalle;
    if (data.detail) return data.detail;
    if (data.error) return data.error;
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) return data.non_field_errors[0];
    const flat = Object.values(data).flat().filter(Boolean);
    return flat.length > 0 ? String(flat[0]) : fallback;
};

const seleccionarProfesionalConTarjetas = async ({
    title,
    subtitle,
    profesionales = [],
    confirmText = 'Continuar',
}) => {
    if (!profesionales.length) return null;

    const cardsHtml = profesionales
        .map(
            (p) => `
            <button type="button" data-prof-id="${p.id}" class="swal-prof-card w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition mb-2">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">${(p.nombre || '?').charAt(0)}</div>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-800 truncate">${p.nombre}</p>
                        <p class="text-xs text-slate-500 truncate">${p.especialidades_nombres?.[0] || 'Profesional'}</p>
                    </div>
                </div>
            </button>
        `
        )
        .join('');

    const { value } = await Swal.fire({
        title,
        html: `
            <div class="text-left">
                <p class="text-xs text-slate-500 mb-3">${subtitle || ''}</p>
                <input id="swal-prof-id" type="hidden" />
                <div class="max-h-[320px] overflow-y-auto pr-1">${cardsHtml}</div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: 'Cancelar',
        width: 'min(92vw, 560px)',
        didOpen: () => {
            const cards = document.querySelectorAll('.swal-prof-card');
            const hidden = document.getElementById('swal-prof-id');
            cards.forEach((card) => {
                card.addEventListener('click', () => {
                    cards.forEach((c) => c.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'border-blue-500'));
                    card.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'border-blue-500');
                    hidden.value = card.getAttribute('data-prof-id');
                });
            });
        },
        preConfirm: () => {
            const profId = document.getElementById('swal-prof-id')?.value;
            if (!profId) {
                Swal.showValidationMessage('Selecciona un profesional para continuar.');
                return null;
            }
            return Number(profId);
        },
    });

    return value || null;
};

const GestionAgenda = () => {
    const [sedes, setSedes] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [servicios, setServicios] = useState([]); 
    const [sedeSeleccionada, setSedeSeleccionada] = useState(null);
    const [selectedProfs, setSelectedProfs] = useState([]); 
    const [agendasCombinadas, setAgendasCombinadas] = useState({});
    const [loadingAgenda, setLoadingAgenda] = useState(false);
    
    const [duracionDefecto, setDuracionDefecto] = useState(20);
    const [horaInicioGrid, setHoraInicioGrid] = useState(6); // Nueva: Hora de inicio (default 6:00)
    const [horaFinGrid, setHoraFinGrid] = useState(20);      // Nueva: Hora fin (default 20:00)
    
    const [viewMode, setViewMode] = useState('config'); 
    const [calendarView, setCalendarView] = useState('week'); 
    const [fechaReferencia, setFechaReferencia] = useState(new Date());
    const [isGridOpen, setIsGridOpen] = useState(false);
    const [footerSearch, setFooterSearch] = useState('');
    const [showFooterResults, setShowFooterResults] = useState(false);
    
    const [clipboardDay, setClipboardDay] = useState(null); 

    const footerInputRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [pendingRestore, setPendingRestore] = useState(location.state?.restoreAgenda || null);
    const { planCode, hasFeature } = useTenantPolicy();
    const agendaAvanzadaEnabled = hasFeature('agenda_avanzada');

    const showAgendaUpsell = () => {
        Swal.fire({
            icon: 'info',
            title: 'Función disponible en plan superior',
            html: `
                <div style="text-align:left">
                    <p><b>Plan actual:</b> ${planCode || 'FREE'}</p>
                    <p>La funcionalidad de <b>Agenda Avanzada</b> incluye:</p>
                    <ul style="margin:6px 0 0 18px">
                        <li>Repeticiones semanales/mensuales.</li>
                        <li>Copiar y pegar agenda entre días/profesionales.</li>
                        <li>Configuración operativa avanzada por bloques.</li>
                    </ul>
                </div>
            `,
            confirmButtonText: 'Entendido',
        });
    };

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
                setSedeSeleccionada(null);
            } catch (error) { console.error(error); }
        };
        cargarDatos();
    }, []);

    useEffect(() => {
        if (!pendingRestore || profesionales.length === 0) return;
        const restoredIds = Array.isArray(pendingRestore.selectedProfIds) ? pendingRestore.selectedProfIds : [];
        const restoredProfs = profesionales
            .filter(p => restoredIds.includes(p.id))
            .map(p => ({ ...p, colorInfo: getColorForId(p.id) }));

        setSelectedProfs(restoredProfs);
        if (pendingRestore.sedeSeleccionada) setSedeSeleccionada(pendingRestore.sedeSeleccionada);
        if (pendingRestore.calendarView) setCalendarView(pendingRestore.calendarView);
        if (pendingRestore.fechaReferencia) setFechaReferencia(new Date(pendingRestore.fechaReferencia));
        setIsGridOpen(Boolean(pendingRestore.isGridOpen));
        setPendingRestore(null);
    }, [pendingRestore, profesionales]);

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
        if (selectedProfs.length === 0) return;
        setLoadingAgenda(true);
        const nuevasAgendas = {};
        try {
            const fIni = new Date(fechaReferencia);
            if (calendarView === 'month') fIni.setDate(1); // Si es mes, desde el 1
            else fIni.setDate(fIni.getDate() - 7);
            
            const fFin = new Date(fIni);
            fFin.setDate(fFin.getDate() + 35); // Cubrir el mes completo + margen
            
            const promesas = selectedProfs.map(async (prof) => {
                const [h, b, c] = await Promise.all([
                    agendaService.getDisponibilidades({ profesional_id: prof.id }),
                    agendaService.getBloqueos({ profesional_id: prof.id }),
                    citasService.getAll({ 
                        profesional_id: prof.id, 
                        fecha_inicio: fIni.toISOString().split('T')[0], 
                        fecha_fin: fFin.toISOString().split('T')[0] 
                    }).catch(() => []) 
                ]);
                return { id: prof.id, data: { horarios: h, bloqueos: b, citas: c } };
            });

            const resultados = await Promise.all(promesas);
            resultados.forEach(res => { nuevasAgendas[res.id] = res.data; });
            setAgendasCombinadas(nuevasAgendas);
        } catch (error) { 
            console.error(error); 
        } finally { 
            setLoadingAgenda(false); 
        }
    }, [selectedProfs, fechaReferencia, calendarView]);

    useEffect(() => {
        if (selectedProfs.length > 0 && viewMode === 'config') {
            cargarMultiplesAgendas();
        } else {
            setAgendasCombinadas({});
        }
    }, [selectedProfs, viewMode, cargarMultiplesAgendas]);

    const navegarCalendario = (direccion) => {
        const nuevaFecha = new Date(fechaReferencia);
        if (calendarView === 'day') nuevaFecha.setDate(nuevaFecha.getDate() + direccion);
        else if (calendarView === 'week') nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7));
        else if (calendarView === 'month') nuevaFecha.setMonth(nuevaFecha.getMonth() + direccion);
        setFechaReferencia(nuevaFecha);
    };

    const irAHoy = () => setFechaReferencia(new Date());

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getDiasVisibles = useCallback(() => {
        const dias = [];
        const current = new Date(fechaReferencia);
        current.setHours(0, 0, 0, 0);

        if (calendarView === 'day') {
            dias.push(new Date(current));
        } else if (calendarView === 'week') {
            const diaSemana = current.getDay();
            const diff = current.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
            const lunes = new Date(current);
            lunes.setDate(diff);
            for (let i = 0; i < 7; i++) {
                const d = new Date(lunes);
                d.setDate(lunes.getDate() + i);
                d.setHours(0, 0, 0, 0);
                dias.push(d);
            }
        } else {
            const year = current.getFullYear();
            const month = current.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                d.setHours(0, 0, 0, 0);
                dias.push(d);
            }
        }
        return dias;
    }, [calendarView, fechaReferencia]);

    const downloadBlob = (content, mimeType, fileName) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const buildAgendaRowsForExport = () => {
        const rows = [];
        const dias = getDiasVisibles();
        const servicioMap = new Map(servicios.map((s) => [Number(s.id), s.nombre]));
        const visibleStart = Math.max(0, Math.min(23, horaInicioGrid));
        const visibleEnd = Math.max(1, Math.min(24, horaFinGrid));

        selectedProfs.forEach((prof) => {
            const agenda = agendasCombinadas[prof.id];
            if (!agenda) return;

            dias.forEach((diaObj) => {
                const fechaStr = formatDate(diaObj);
                const jsDay = diaObj.getDay();
                const diaIndexBD = jsDay === 0 ? 6 : jsDay - 1;

                const horariosDia = (agenda.horarios || []).filter((h) => {
                    if (parseInt(h.profesional_id, 10) !== parseInt(prof.id, 10)) return false;
                    if (h.dia_semana !== diaIndexBD) return false;
                    if (h.fecha && h.fecha !== fechaStr) return false;
                    if (h.fecha_inicio_vigencia && fechaStr < h.fecha_inicio_vigencia) return false;
                    if (h.fecha_fin_vigencia && fechaStr > h.fecha_fin_vigencia) return false;
                    const hIni = parseInt(String(h.hora_inicio).slice(0, 2), 10);
                    const hFin = parseInt(String(h.hora_fin).slice(0, 2), 10);
                    return hFin > visibleStart && hIni < visibleEnd;
                });

                horariosDia.forEach((h) => {
                    rows.push({
                        tipo: 'DISPONIBILIDAD',
                        profesional: prof.nombre,
                        fecha: fechaStr,
                        inicio: String(h.hora_inicio).slice(0, 5),
                        fin: String(h.hora_fin).slice(0, 5),
                        servicio: h.servicio_id ? (servicioMap.get(Number(h.servicio_id)) || `Servicio ${h.servicio_id}`) : 'General',
                        estado: h.activo ? 'ACTIVA' : 'INACTIVA',
                        detalle: h.fecha ? 'Fecha unica' : 'Recurrente',
                    });
                });

                const bloqueosDia = (agenda.bloqueos || []).filter((b) => {
                    const bIni = new Date(b.fecha_inicio);
                    const bFin = new Date(b.fecha_fin);
                    const bFecha = formatDate(bIni);
                    if (bFecha !== fechaStr) return false;
                    const bIniH = bIni.getHours();
                    const bFinH = bFin.getHours() + (bFin.getMinutes() > 0 ? 1 : 0);
                    return bFinH > visibleStart && bIniH < visibleEnd;
                });

                bloqueosDia.forEach((b) => {
                    const bIni = new Date(b.fecha_inicio);
                    const bFin = new Date(b.fecha_fin);
                    rows.push({
                        tipo: 'BLOQUEO',
                        profesional: prof.nombre,
                        fecha: fechaStr,
                        inicio: `${String(bIni.getHours()).padStart(2, '0')}:${String(bIni.getMinutes()).padStart(2, '0')}`,
                        fin: `${String(bFin.getHours()).padStart(2, '0')}:${String(bFin.getMinutes()).padStart(2, '0')}`,
                        servicio: '',
                        estado: 'BLOQUEADO',
                        detalle: b.motivo || 'Sin motivo',
                    });
                });

                const citasDia = (agenda.citas || []).filter((c) => c.fecha === fechaStr);
                citasDia.forEach((c) => {
                    rows.push({
                        tipo: 'CITA',
                        profesional: prof.nombre,
                        fecha: fechaStr,
                        inicio: String(c.hora_inicio || '').slice(0, 5),
                        fin: String(c.hora_fin || '').slice(0, 5),
                        servicio: c.servicio_nombre || '',
                        estado: c.estado || '',
                        detalle: c.paciente_nombre || 'Paciente',
                    });
                });
            });
        });

        return rows.sort((a, b) => {
            if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
            if (a.profesional !== b.profesional) return a.profesional.localeCompare(b.profesional);
            return a.inicio.localeCompare(b.inicio);
        });
    };

    const toCsv = (rows) => {
        if (!rows.length) return '';
        const headers = Object.keys(rows[0]);
        const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const lines = [
            headers.join(','),
            ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))
        ];
        return lines.join('\n');
    };

    const toExcelHtml = (rows) => {
        const headers = Object.keys(rows[0] || {});
        const headHtml = headers.map((h) => `<th style="padding:8px;background:#e2e8f0;border:1px solid #cbd5e1">${h}</th>`).join('');
        const bodyHtml = rows.map((r) => {
            const tds = headers.map((h) => `<td style="padding:6px;border:1px solid #e2e8f0">${String(r[h] ?? '')}</td>`).join('');
            return `<tr>${tds}</tr>`;
        }).join('');
        return `<html><meta charset="utf-8" /><table>${`<thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody>`}</table></html>`;
    };

    const exportToPdfPrint = (rows) => {
        const headers = Object.keys(rows[0] || {});
        const headHtml = headers.map((h) => `<th style="padding:6px;border:1px solid #ddd;background:#f1f5f9">${h}</th>`).join('');
        const bodyHtml = rows.map((r) => {
            const tds = headers.map((h) => `<td style="padding:5px;border:1px solid #eee">${String(r[h] ?? '')}</td>`).join('');
            return `<tr>${tds}</tr>`;
        }).join('');

        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <html>
            <head>
                <title>Exportacion Agenda</title>
                <meta charset="utf-8" />
            </head>
            <body style="font-family: Arial, sans-serif; padding: 16px;">
                <h2>Exportacion de Agenda</h2>
                <table style="border-collapse: collapse; width: 100%; font-size: 12px;">
                    <thead><tr>${headHtml}</tr></thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
                <script>window.onload = function(){ window.print(); }<\/script>
            </body>
            </html>
        `);
        win.document.close();
    };

    const handleExportGrid = async () => {
        if (!selectedProfs.length) {
            return Swal.fire('Atencion', 'Selecciona al menos un profesional para exportar.', 'warning');
        }
        const rows = buildAgendaRowsForExport();
        if (!rows.length) {
            return Swal.fire('Info', 'No hay datos visibles en la grilla para exportar.', 'info');
        }

        const { value: format } = await Swal.fire({
            title: 'Exportar grilla',
            input: 'radio',
            inputOptions: {
                CSV: 'CSV (.csv)',
                XLS: 'Excel (.xls)',
                PDF: 'PDF (imprimir/guardar)',
            },
            inputValue: 'CSV',
            showCancelButton: true,
            confirmButtonText: 'Exportar',
            cancelButtonText: 'Cancelar',
        });

        if (!format) return;

        const stamp = new Date().toISOString().slice(0, 10);
        if (format === 'CSV') {
            const csv = toCsv(rows);
            downloadBlob(csv, 'text/csv;charset=utf-8;', `agenda_${stamp}.csv`);
        } else if (format === 'XLS') {
            const html = toExcelHtml(rows);
            downloadBlob(html, 'application/vnd.ms-excel', `agenda_${stamp}.xls`);
        } else if (format === 'PDF') {
            exportToPdfPrint(rows);
        }
    };

    const handleCopySchedule = (fechaOrigen) => {
        if (!agendaAvanzadaEnabled) {
            showAgendaUpsell();
            return;
        }
        if (selectedProfs.length !== 1) {
            return Swal.fire('Atencion', 'Selecciona un solo medico como origen para copiar el dia.', 'warning');
        }
        setClipboardDay({ date: fechaOrigen, profId: selectedProfs[0].id, profNombre: selectedProfs[0].nombre });
        const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 3000 });
        Toast.fire({ icon: 'info', title: 'Dia copiado. Haz clic en "Pegar" en el dia destino.' });
    };

    const handlePasteSchedule = async (fechaDestino) => {
        if (!agendaAvanzadaEnabled) {
            showAgendaUpsell();
            return;
        }
        if (!clipboardDay) return;

        let targetProfId = null;
        let targetProfNombre = "";

        if (selectedProfs.length === 0) {
            return Swal.fire('Error', 'Selecciona al menos un profesional destino.', 'error');
        } else if (selectedProfs.length === 1) {
            targetProfId = selectedProfs[0].id;
            targetProfNombre = selectedProfs[0].nombre;
        } else {
            const profId = await seleccionarProfesionalConTarjetas({
                title: 'Selecciona profesional destino',
                subtitle: 'Tienes varios seleccionados. Elige a quién se le pegará la agenda.',
                profesionales: selectedProfs,
                confirmText: 'Pegar aquí',
            });
            if (!profId) return;
            targetProfId = parseInt(profId, 10);
            targetProfNombre = selectedProfs.find(p => p.id === targetProfId).nombre;
        }

        try {
            const fechaOrigenStr = clipboardDay.date.toISOString().split('T')[0];
            const fechaDestinoStr = fechaDestino.toISOString().split('T')[0];
            
            const { isConfirmed } = await Swal.fire({
                title: '¿Pegar programacion?',
                html: `Copiaras los turnos del <b>${fechaOrigenStr}</b> (Dr/a. ${clipboardDay.profNombre}) <br/><br/> Destino: <b>${fechaDestinoStr}</b> para <b>Dr/a. ${targetProfNombre}</b>.`,
                icon: 'question',
                showCancelButton: true, confirmButtonText: 'Si, pegar', confirmButtonColor: '#10B981'
            });

            if (!isConfirmed) return;

            setLoadingAgenda(true);

            const originDayIndex = clipboardDay.date.getDay() === 0 ? 6 : clipboardDay.date.getDay() - 1;
            const turnosOrigen = agendasCombinadas[clipboardDay.profId]?.horarios.filter(h => {
                if (h.dia_semana !== originDayIndex) return false;
                const dbFecha = h.fecha ? String(h.fecha).slice(0, 10) : null;
                if (dbFecha && dbFecha !== fechaOrigenStr) return false;
                if (!dbFecha) {
                    const dbInicio = h.fecha_inicio_vigencia ? String(h.fecha_inicio_vigencia).slice(0,10) : null;
                    const dbFin = h.fecha_fin_vigencia ? String(h.fecha_fin_vigencia).slice(0,10) : null;
                    if (dbInicio && fechaOrigenStr < dbInicio) return false;
                    if (dbFin && fechaOrigenStr > dbFin) return false;
                }
                return true;
            }) || [];

            if (turnosOrigen.length === 0) {
                setLoadingAgenda(false);
                return Swal.fire('Aviso', 'El dia de origen seleccionado no tiene turnos configurados.', 'info');
            }

            const destDayIndex = fechaDestino.getDay() === 0 ? 6 : fechaDestino.getDay() - 1;
            
            for (const turno of turnosOrigen) {
                const lugarIdValido = resolveLugarIdForProfesional(targetProfId, turno.lugar_id);
                if (!lugarIdValido) {
                    throw new Error('No existe una sede valida para el profesional destino.');
                }
                await agendaService.createDisponibilidad({
                    profesional_id: targetProfId,
                    lugar_id: lugarIdValido, 
                    dia_semana: destDayIndex,
                    hora_inicio: turno.hora_inicio,
                    hora_fin: turno.hora_fin,
                    servicio_id: turno.servicio_id,
                    fecha_inicio_vigencia: fechaDestinoStr,
                    fecha_fin_vigencia: fechaDestinoStr // Pega como un dia unico (HOY)
                });
            }

            setClipboardDay(null); 
            await cargarMultiplesAgendas(); 
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Dia clonado con exito', timer: 2000, showConfirmButton: false });
            
        } catch (error) {
            console.error(error);
            Swal.fire('Error', getErrorMessage(error, 'No se pudo duplicar la agenda. Es posible que haya cruces en el destino.'), 'error');
        } finally { 
            setLoadingAgenda(false); 
        }
    };

    const handleCancelPaste = () => {
        setClipboardDay(null);
        Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 2000 }).fire({ icon: 'info', title: 'Copiado cancelado' });
    };

    const resolveLugarIdForProfesional = (profId, fallbackLugarId = null) => {
        const prof = profesionales.find((p) => Number(p.id) === Number(profId));
        const lugares = Array.isArray(prof?.lugares_atencion)
            ? prof.lugares_atencion.map((id) => Number(id))
            : [];

        const sedeNum = Number(sedeSeleccionada);
        if (Number.isInteger(sedeNum) && sedeNum > 0 && lugares.includes(sedeNum)) return sedeNum;

        const fallbackNum = Number(fallbackLugarId);
        if (Number.isInteger(fallbackNum) && fallbackNum > 0 && lugares.includes(fallbackNum)) return fallbackNum;

        return lugares.length > 0 ? lugares[0] : null;
    };

    const handleAgendarExpress = (slot, fechaStr) => {
        const lugarIdValido = resolveLugarIdForProfesional(slot.profId, slot.turno.lugar_id);
        const restoreAgenda = {
            sedeSeleccionada,
            selectedProfIds: selectedProfs.map(p => p.id),
            calendarView,
            fechaReferencia: fechaReferencia.toISOString(),
            isGridOpen: true
        };

        navigate('/dashboard/agendar-admin', {
            state: {
                slotPreseleccionado: {
                    profId: slot.profId,
                    profNombre: slot.profNombre,
                    fecha: fechaStr,
                    inicio: slot.inicio,
                    servicioId: slot.turno.servicio_id, 
                    lugarId: lugarIdValido,
                    returnToAgenda: true,
                    restoreAgenda
                },
                returnToAgenda: true,
                restoreAgenda
            }
        });
    };

    const handleCrearTurno = async (fechaColumnaObj, hora, horaFinSugerida = null) => {
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
            const profId = await seleccionarProfesionalConTarjetas({
                title: 'Selecciona profesional',
                subtitle: `Crear bloque para ${diaNombreCap} a las ${hora}:00`,
                profesionales: selectedProfs,
                confirmText: 'Continuar',
            });
            if (!profId) return;
            targetProfId = Number(profId);
        } else if (selectedProfs.length === 1) {
            targetProfId = Number(selectedProfs[0].id);
        } else { return; }

        if (!Number.isInteger(targetProfId) || targetProfId <= 0) {
            return Swal.fire('Error', 'Profesional inválido. Intenta seleccionarlo nuevamente.', 'error');
        }

        const profesionalObj = profesionales.find(p => Number(p.id) === targetProfId);
        const serviciosFiltrados = servicios.filter(s => profesionalObj?.servicios_habilitados?.includes(s.id));

        const serviciosCards = [
            `<button type="button" data-servicio-id="" class="swal-servicio-card w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                <p class="text-sm font-bold text-slate-800 dark:text-slate-100">Sin servicio especifico</p>
                <p class="text-xs text-slate-500 dark:text-slate-300">Usa duracion base de ${duracionDefecto} min</p>
            </button>`,
            ...serviciosFiltrados.map(s => `
                <button type="button" data-servicio-id="${s.id}" class="swal-servicio-card w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-100">${s.nombre}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-300">${s.duracion_minutos} min</p>
                </button>
            `)
        ].join('');

        const recurrenciasCards = agendaAvanzadaEnabled
            ? `
                <button type="button" data-rec="HOY" class="swal-rec-card w-full text-left p-3 rounded-xl border border-blue-400 bg-blue-50 dark:bg-blue-900/40 transition">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-100">Solo por hoy</p>
                    <p class="text-xs text-slate-500 dark:text-slate-300">${fechaStr}</p>
                </button>
                <button type="button" data-rec="INDEFINIDO" class="swal-rec-card w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-100">Indefinido</p>
                    <p class="text-xs text-slate-500 dark:text-slate-300">Todos los ${diaNombre}s</p>
                </button>
                <button type="button" data-rec="1_SEMANA" class="swal-rec-card w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-100">1 semana</p>
                    <p class="text-xs text-slate-500 dark:text-slate-300">2 repeticiones</p>
                </button>
                <button type="button" data-rec="15_DIAS" class="swal-rec-card w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-100">15 dias</p>
                    <p class="text-xs text-slate-500 dark:text-slate-300">3 repeticiones</p>
                </button>
                <button type="button" data-rec="1_MES" class="swal-rec-card w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-100">1 mes</p>
                    <p class="text-xs text-slate-500 dark:text-slate-300">4-5 repeticiones</p>
                </button>
            `
            : `
                <button type="button" data-rec="HOY" class="swal-rec-card w-full text-left p-3 rounded-xl border border-blue-400 bg-blue-50 dark:bg-blue-900/40 transition">
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-100">Solo por hoy</p>
                    <p class="text-xs text-slate-500 dark:text-slate-300">${fechaStr}</p>
                </button>
                <div class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-70">
                    <p class="text-sm font-bold text-slate-600 dark:text-slate-200">Repeticiones avanzadas</p>
                    <p class="text-xs text-slate-500 dark:text-slate-300">Disponible desde plan STARTER.</p>
                </div>
            `;

        const horaInicio = `${hora.toString().padStart(2, '0')}:00`;
        const horaFin = `${(horaFinSugerida || (hora + 1)).toString().padStart(2, '0')}:00`;

        const isDarkMode = document.documentElement.classList.contains('dark');
        const selectedCardClasses = ['ring-2', 'ring-blue-500', 'bg-blue-50', 'border-blue-500', 'dark:bg-blue-900/40', 'dark:border-blue-400'];

        const { value: formValues } = await Swal.fire({
            title: `<span class="text-xl font-bold text-slate-900 dark:text-slate-100">Nuevo bloque de agenda</span>`,
            html: `
                <div class="text-left px-2 text-slate-700 dark:text-slate-200">
                    <div class="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 p-3 rounded-xl border border-blue-100 dark:border-slate-600 mb-4 flex items-center gap-3 shadow-sm">
                        <div class="w-10 h-10 bg-blue-200 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-200 font-bold shadow-inner">
                            ${profesionalObj?.nombre.charAt(0)}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-blue-900 dark:text-blue-200">${profesionalObj?.nombre}</p>
                            <p class="text-xs text-blue-700 dark:text-blue-300">${diaNombreCap}, ${fechaStr}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Hora inicio del bloque</label>
                            <input id="swal-inicio" type="time" class="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" value="${horaInicio}">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Hora fin del bloque</label>
                            <input id="swal-fin" type="time" class="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" value="${horaFin}">
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Tipo de agenda para este bloque</label>
                        <input id="swal-servicio" type="hidden" value="" />
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            ${serviciosCards}
                        </div>
                    </div>

                    <div class="mb-2">
                        <label class="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Repetición</label>
                        <input id="swal-recurrencia" type="hidden" value="HOY" />
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            ${recurrenciasCards}
                        </div>
                        <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-center">Define por cuanto tiempo estara disponible este bloque.</p>
                    </div>
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'Guardar bloque',
            confirmButtonColor: '#2563EB',
            cancelButtonText: 'Cancelar',
            width: 'min(92vw, 560px)',
            background: isDarkMode ? '#0f172a' : '#ffffff',
            color: isDarkMode ? '#e2e8f0' : '#0f172a',
            customClass: {
                popup: isDarkMode ? 'border border-slate-700 shadow-2xl' : 'border border-slate-100 shadow-xl',
            },
            focusConfirm: false,
            didOpen: () => {
                const servicioInput = document.getElementById('swal-servicio');
                const servicioCards = document.querySelectorAll('.swal-servicio-card');
                servicioCards.forEach((card, idx) => {
                    if (idx === 0) card.classList.add(...selectedCardClasses);
                    card.addEventListener('click', () => {
                        servicioCards.forEach((c) => c.classList.remove(...selectedCardClasses));
                        card.classList.add(...selectedCardClasses);
                        servicioInput.value = card.getAttribute('data-servicio-id') || '';
                    });
                });

                const recInput = document.getElementById('swal-recurrencia');
                const recCards = document.querySelectorAll('.swal-rec-card');
                recCards.forEach((card) => {
                    card.addEventListener('click', () => {
                        recCards.forEach((c) => c.classList.remove(...selectedCardClasses));
                        card.classList.add(...selectedCardClasses);
                        recInput.value = card.getAttribute('data-rec') || 'HOY';
                    });
                });
            },
            preConfirm: () => {
                const inicio = document.getElementById('swal-inicio').value;
                const fin = document.getElementById('swal-fin').value;
                const servicio = document.getElementById('swal-servicio').value;
                const recurrencia = document.getElementById('swal-recurrencia').value;

                if (!inicio || !fin) {
                    Swal.showValidationMessage('Debes seleccionar hora de inicio y hora final.');
                    return null;
                }
                if (inicio >= fin) {
                    Swal.showValidationMessage('La hora final debe ser posterior a la hora inicial.');
                    return null;
                }
                return { inicio, fin, servicio, recurrencia };
            }
        });

        if (formValues) {
            try {
                const fechaBase = new Date(fechaColumnaObj);
                let fechaFinVigencia = null;
                const lugarIdValido = resolveLugarIdForProfesional(targetProfId);

                if (!lugarIdValido) {
                    return Swal.fire(
                        'Sede requerida',
                        'El profesional no tiene sedes habilitadas para crear agenda. Valida su configuracion en staff.',
                        'warning'
                    );
                }

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
                    lugar_id: Number(lugarIdValido), 
                    dia_semana: diaIndexBD,
                    hora_inicio: formValues.inicio, 
                    hora_fin: formValues.fin, 
                    servicio_id: formValues.servicio ? Number(formValues.servicio) : null,
                    fecha_inicio_vigencia: formatLocalISO(fechaBase),
                    fecha_fin_vigencia: fechaFinVigencia ? formatLocalISO(fechaFinVigencia) : null
                };

                await agendaService.createDisponibilidad(payload);
                cargarMultiplesAgendas();
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Horario creado', showConfirmButton: false, timer: 1500 });
            } catch (e) { 
                console.error(e);
                Swal.fire('Error', getErrorMessage(e, 'No se pudo crear el bloque de agenda.'), 'error'); 
            }
        }
    };

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
            
            const slotStart = new Date(`${fechaPreseleccionada}T${inicioStr}:00`);
            const bloqueoMatch = bloqueosFrescos.find(b => {
                const bStart = new Date(b.fecha_inicio);
                const bEnd = new Date(b.fecha_fin);
                return slotStart >= bStart && slotStart < bEnd;
            });

            slots.push({
                inicio: inicioStr, fin: finStr,
                bloqueado: !!bloqueoMatch, bloqueoId: bloqueoMatch?.id,
                motivo: bloqueoMatch?.motivo, esPasado: slotStart < ahora
            });
            actualMin += duracion;
        }

        const slotsHtml = slots.map(slot => {
            let btnAction = '';
            let info = '';
            if (slot.esPasado) {
                btnAction = '<span class="text-xs text-gray-400 font-bold">Pasado</span>';
            } else if (slot.bloqueado) {
                info = `<span class="text-[10px] text-red-600 block italic">Bloqueado: ${slot.motivo || 'Bloqueado'}</span>`;
                btnAction = `<button data-slot-action="DESBLOQUEAR" data-bloqueo-id="${slot.bloqueoId}" class="text-xs bg-white text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">Desbloquear</button>`;
            } else {
                btnAction = `<button data-slot-action="BLOQUEAR" data-inicio="${slot.inicio}" data-fin="${slot.fin}" class="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100">Bloquear</button>`;
            }
            return `<div class="flex justify-between items-center p-2 mb-1 rounded border ${slot.bloqueado ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}">
                <div><span class="font-mono text-sm font-bold text-gray-700">${slot.inicio} - ${slot.fin}</span>${info}</div>
                ${btnAction}</div>`;
        }).join('');

        Swal.fire({
            title: `Detalle del Bloque: ${fechaPreseleccionada}`,
            html: `<div class="text-left bg-gray-50 p-4 rounded border border-gray-200">
                <p class="text-xs text-gray-500 mb-2"><b>${nombreServicio}</b> (${duracion} min)<br/>Base: ${turno.hora_inicio} - ${turno.hora_fin}</p>
                <div class="max-h-[300px] overflow-y-auto pr-1 custom-scroll">${slotsHtml}</div>
                <div class="mt-4 pt-2 border-t text-center">
                    <button id="btn-eliminar-base" class="text-xs text-red-500 hover:underline font-bold">Eliminar Base Completa</button>
                </div>
            </div>`,
            showConfirmButton: false, showCloseButton: true, width: '500px',
            didOpen: () => {
                const popup = Swal.getPopup();
                const btnEliminar = popup?.querySelector('#btn-eliminar-base');
                const slotBtns = popup?.querySelectorAll('[data-slot-action]');

                slotBtns?.forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const accion = btn.getAttribute('data-slot-action');
                        const inicio = btn.getAttribute('data-inicio');
                        const fin = btn.getAttribute('data-fin');
                        const bloqueoId = btn.getAttribute('data-bloqueo-id');

                        try {
                            if (accion === 'BLOQUEAR') {
                                const { value: motivo } = await Swal.fire({
                                    title: `Bloquear ${inicio}`,
                                    input: 'text',
                                    inputPlaceholder: 'Motivo del bloqueo',
                                    showCancelButton: true
                                });
                                if (!motivo) return;
                                await agendaService.createBloqueo({
                                    profesional_id: turno.profesional_id,
                                    fecha_inicio: `${fechaPreseleccionada}T${inicio}:00`,
                                    fecha_fin: `${fechaPreseleccionada}T${fin}:00`,
                                    motivo
                                });
                            } else if (accion === 'DESBLOQUEAR' && bloqueoId) {
                                await agendaService.deleteBloqueo(bloqueoId);
                            }
                            await cargarMultiplesAgendas();
                            handleGestionarTurno(turno, fechaPreseleccionada);
                        } catch (e) {
                            Swal.fire('Error', getErrorMessage(e, 'No se pudo actualizar el bloqueo.'), 'error');
                        }
                    });
                });

                btnEliminar?.addEventListener('click', async () => {
                    Swal.close();
                    const { value: opcion } = await Swal.fire({
                        title: 'Eliminar horario',
                        text: '¿Qué deseas eliminar?',
                        icon: 'question',
                        showDenyButton: true,
                        showCancelButton: true,
                        confirmButtonText: 'Toda la serie',
                        denyButtonText: 'Solo este día',
                        confirmButtonColor: '#d33',
                        denyButtonColor: '#f59e0b'
                    });

                    try {
                        if (opcion === true) {
                            const resp = await agendaService.deleteDisponibilidad(turno.id);
                            await Swal.fire({
                                title: 'Serie actualizada',
                                text: resp.mensaje || 'La serie fue eliminada correctamente.',
                                icon: 'success'
                            });
                        } else if (opcion === false) {
                            if (turno.fecha) {
                                await agendaService.deleteDisponibilidad(turno.id);
                                await Swal.fire('Eliminado', 'Se eliminó solo este día.', 'success');
                            } else {
                                await agendaService.createBloqueo({
                                    profesional_id: turno.profesional_id,
                                    fecha_inicio: `${fechaPreseleccionada}T${turno.hora_inicio}`,
                                    fecha_fin: `${fechaPreseleccionada}T${turno.hora_fin}`,
                                    motivo: 'Excepción de agenda: ocultar solo este día'
                                });
                                await Swal.fire('Aplicado', 'Se ocultó solo este día mediante un bloqueo.', 'success');
                            }
                        }
                        await cargarMultiplesAgendas();
                    } catch (e) {
                        await Swal.fire('Error', getErrorMessage(e, 'No se pudo eliminar el bloque.'), 'error');
                    }
                });
            }
        });
    };

    const handleBloquearSlotRapido = async ({ profId, fecha, inicio, fin, motivo }) => {
        try {
            await agendaService.createBloqueo({
                profesional_id: profId,
                fecha_inicio: `${fecha}T${inicio}:00`,
                fecha_fin: `${fecha}T${fin}:00`,
                motivo: motivo || 'Bloqueo manual'
            });
            await cargarMultiplesAgendas();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Bloqueo creado', timer: 1800, showConfirmButton: false });
        } catch (e) {
            Swal.fire('Error', getErrorMessage(e, 'No se pudo bloquear el espacio.'), 'error');
        }
    };

    const resultadosFooter = footerSearch.length > 0 ? profesionales.filter(p => !selectedProfs.find(sel => sel.id === p.id) && p.nombre.toLowerCase().includes(footerSearch.toLowerCase())) : [];

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100 overflow-hidden relative">
            <div className="flex-shrink-0 z-30 h-full shadow-lg">
                <ListaProfesionales 
                    sedes={sedes} profesionales={profesionales} 
                    sedeSeleccionada={sedeSeleccionada} setSedeSeleccionada={setSedeSeleccionada} 
                    selectedProfs={selectedProfs} toggleProfesional={toggleProfesional} 
                    onOpenModal={() => setIsGridOpen(true)} 
                />
            </div>
            <div className="flex-1 flex flex-col h-full bg-gray-50 relative overflow-hidden min-w-0">
                <div className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800">{viewMode === 'config' ? 'Planificacion de Horarios' : 'Historial de Atencion'}</h2>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('config')} className={`px-4 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition ${viewMode === 'config' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><FaCalendarAlt /> Planificacion</button>
                        <button onClick={() => setViewMode('historial')} className={`px-4 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition ${viewMode === 'historial' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><FaHistory /> Historial</button>
                    </div>
                </div>
                {!agendaAvanzadaEnabled && (
                    <div className="mx-6 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <b>Modo básico activo:</b> las funciones avanzadas de agenda están bloqueadas en este plan.
                        <button
                            type="button"
                            onClick={showAgendaUpsell}
                            className="ml-2 underline font-bold"
                        >
                            Ver beneficios de upgrade
                        </button>
                    </div>
                )}
                {viewMode === 'historial' ? <HistorialPanel profesionalSeleccionado={selectedProfs[0]} /> : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md border border-gray-100">
                            <FaUsers size={48} className="mx-auto mb-4 text-blue-200"/>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">Gestion de Agendas</h3>
                            <p className="mb-6 text-sm text-gray-500">{selectedProfs.length > 0 ? `Gestionando agenda de: ${selectedProfs.map(p => p.nombre).join(', ')}` : "Selecciona profesionales para gestionar su horario."}</p>
                            {selectedProfs.length > 0 ? <button onClick={() => setIsGridOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition font-bold flex items-center gap-2 mx-auto animate-pulse"><FaCalendarAlt /> Abrir Calendario Semanal</button> : <div className="text-xs text-orange-400 bg-orange-50 p-2 rounded">← Selecciona un medico</div>}
                        </div>
                    </div>
                )}
            </div>
            {isGridOpen && viewMode === 'config' && (
                <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-fadeIn">
                    <div className="min-h-16 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900 shadow-sm shrink-0 z-50">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsGridOpen(false)} className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 dark:text-slate-300 hover:text-red-600 rounded-full transition"><FaTimes size={20}/></button>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2"><FaCalendarAlt className="text-blue-600 dark:text-blue-400"/> Agenda Visual</h2>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-1 px-3 rounded-lg border border-gray-200 dark:border-slate-600">
                                <FaClock className="text-gray-400 dark:text-slate-400"/>
                                <span className="text-xs font-bold text-gray-500 dark:text-slate-300">Rango visible:</span>
                                <input type="number" min="0" max="23" value={horaInicioGrid} onChange={(e) => setHoraInicioGrid(parseInt(e.target.value) || 0)} className="w-12 text-center text-sm font-bold bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded outline-none"/>
                                <span className="text-xs font-bold text-gray-500 dark:text-slate-300">a</span>
                                <input type="number" min="1" max="24" value={horaFinGrid} onChange={(e) => setHoraFinGrid(parseInt(e.target.value) || 24)} className="w-12 text-center text-sm font-bold bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded outline-none"/>
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-1 px-3 rounded-lg border border-gray-200 dark:border-slate-600">
                                <FaCogs className="text-gray-400 dark:text-slate-400"/>
                                <span className="text-xs font-bold text-gray-500 dark:text-slate-300">Duracion base:</span>
                                <input type="number" value={duracionDefecto} onChange={(e) => setDuracionDefecto(parseInt(e.target.value) || 20)} className="w-12 text-center text-sm font-bold bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded outline-none"/><span className="text-xs text-gray-500 dark:text-slate-300">min</span>
                            </div>

                            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1"><button onClick={() => navegarCalendario(-1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-gray-600 dark:text-slate-200"><FaChevronLeft/></button><button onClick={irAHoy} className="mx-1 px-3 py-1 text-sm font-bold text-gray-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded">Hoy</button><button onClick={() => navegarCalendario(1)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-gray-600 dark:text-slate-200"><FaChevronRight/></button></div>
                            <span className="font-bold text-gray-700 dark:text-slate-200 capitalize w-32 text-center hidden md:block">{fechaReferencia.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
                            
                            <button onClick={handleExportGrid} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                <FaFileExport />
                                Exportar
                            </button>
                            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">{['day','week','month'].map(v => <button key={v} onClick={() => setCalendarView(v)} className={`px-3 py-1 rounded text-xs font-bold ${calendarView === v ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-slate-300'}`}>{v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mes'}</button>)}</div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-gray-50 dark:bg-slate-950">
                        {loadingAgenda ? (
                            <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
                        ) : (
                            <GrillaSemanal 
                                selectedProfs={selectedProfs} 
                                agendasCombinadas={agendasCombinadas} 
                                servicios={servicios} 
                                duracionDefecto={duracionDefecto} 
                                
                                horaInicioGrid={horaInicioGrid}
                                horaFinGrid={horaFinGrid}

                                onCrearTurno={handleCrearTurno} 
                                onGestionarTurno={handleGestionarTurno} 
                                onAgendarCita={handleAgendarExpress} 
                                onBloquearSlotRapido={handleBloquearSlotRapido}
                                calendarView={calendarView} 
                                fechaReferencia={fechaReferencia} 
                                setCalendarView={setCalendarView} 
                                onCopyDay={handleCopySchedule}
                                onPasteDay={handlePasteSchedule}
                                clipboardDay={clipboardDay}
                                refreshAgenda={cargarMultiplesAgendas} 
                                agendaAvanzadaEnabled={agendaAvanzadaEnabled}
                                onAgendaUpsell={showAgendaUpsell}
                            />
                        )}
                    </div>
                    
                    <div className="h-14 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center shrink-0 z-50">
                        <div className="flex-1 flex gap-3 overflow-x-auto p-2 scrollbar-thin items-center">{selectedProfs.map(p => <div key={p.id} className={`px-2 py-1 rounded border flex items-center gap-2 shrink-0 ${p.colorInfo.clase} shadow-sm`}><div className="w-2 h-2 rounded-full bg-current opacity-50"></div><span className="font-bold truncate max-w-[150px] text-xs">{p.nombre}</span><button onClick={() => toggleProfesional(p)} className="hover:bg-white/50 rounded-full p-0.5"><FaTimes size={10}/></button></div>)}</div>
                        <div className="w-64 border-l border-gray-200 dark:border-slate-700 pl-3 pr-3 py-2 bg-gray-50 dark:bg-slate-800 relative h-full flex items-center group"><FaSearch className="text-gray-400 dark:text-slate-400 mr-2 text-xs"/><input ref={footerInputRef} type="text" placeholder="Agregar otro profesional..." className="w-full bg-transparent text-sm outline-none placeholder-gray-400 dark:placeholder-slate-500 text-gray-700 dark:text-slate-100" value={footerSearch} onChange={(e) => { setFooterSearch(e.target.value); setShowFooterResults(true); }} onFocus={() => setShowFooterResults(true)}/>{showFooterResults && footerSearch.length > 0 && <div className="absolute bottom-full right-0 left-0 mb-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-t-lg shadow-xl max-h-60 overflow-y-auto z-50">{resultadosFooter.map(p => <div key={p.id} className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-100 dark:border-slate-700 flex items-center justify-between group/item" onClick={() => toggleProfesional(p)}><div className="flex flex-col"><span className="text-sm font-bold text-gray-700 dark:text-slate-100">{p.nombre}</span><span className="text-[10px] text-gray-400 dark:text-slate-400">{p.especialidades_nombres?.[0]}</span></div><FaPlusCircle className="text-gray-300 dark:text-slate-500 group-hover/item:text-blue-500"/></div>)}</div>}{showFooterResults && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowFooterResults(false)}></div>}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionAgenda;



