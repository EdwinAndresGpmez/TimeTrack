import React, { useEffect, useState, useRef } from 'react';
import { 
    FaPlus, FaLock, FaHistory, FaUser, FaRegCopy, FaPaste, 
    FaBan, FaCogs 
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const GrillaSemanal = ({ 
    selectedProfs = [], 
    agendasCombinadas = {}, 
    servicios, 
    duracionDefecto, 
    horaInicioGrid = 6,
    horaFinGrid = 20,
    onCrearTurno, 
    onGestionarTurno,
    onAgendarCita, 
    onBloquearSlotRapido,
    calendarView, 
    fechaReferencia,
    setCalendarView,
    onCopyDay,
    onPasteDay,
    clipboardDay,
    refreshAgenda
}) => {
    
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, data: null });
    const [dragSelection, setDragSelection] = useState(null); 
    const isDragging = useRef(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768 && (calendarView === 'week' || calendarView === 'month')) {
                if(setCalendarView) setCalendarView('day');
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        
        const handleClickOutside = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('click', handleClickOutside);
        };
    }, [calendarView, setCalendarView, contextMenu]);

    const startHour = Math.max(0, Math.min(23, horaInicioGrid));
    const endHour = Math.max(1, Math.min(24, horaFinGrid));
    const HORAS = Array.from({ length: endHour - startHour }, (_, i) => i + startHour);

    const getDiasColumna = () => {
        const dias = [];
        const current = new Date(fechaReferencia);
        current.setHours(0, 0, 0, 0);

        if (calendarView === 'day') {
            dias.push(new Date(current));
        } 
        else if (calendarView === 'week') {
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
        }
        else if (calendarView === 'month') {
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
    };

    const getServiceInfo = (id) => {
        const s = servicios.find(srv => srv.id === id);
        return s 
            ? { nombre: s.nombre, duracion: s.duracion_minutos, buffer: s.buffer_minutos || 0 } 
            : { nombre: 'General', duracion: duracionDefecto, buffer: 0 };
    };

    const handleMouseDown = (dayIndex, hour) => {
        if (contextMenu.visible) return;
        isDragging.current = true;
        setDragSelection({ dayIndex, startHour: hour, endHour: hour });
    };

    const handleMouseEnter = (dayIndex, hour) => {
        if (!isDragging.current || !dragSelection) return;
        if (dayIndex !== dragSelection.dayIndex) return;
        setDragSelection(prev => ({ ...prev, endHour: hour }));
    };

    const handleMouseUp = (fechaColumna) => {
        if (!isDragging.current || !dragSelection) {
            isDragging.current = false;
            return;
        }
        isDragging.current = false;

        const start = Math.min(dragSelection.startHour, dragSelection.endHour);
        const end = Math.max(dragSelection.startHour, dragSelection.endHour);
        
        onCrearTurno(fechaColumna, start, end + 1); 
        setDragSelection(null);
    };

    const handleContextMenu = (e, slotData, fechaStr) => {
        e.preventDefault(); 
        setContextMenu({ visible: true, x: e.pageX, y: e.pageY, data: { slot: slotData, fecha: fechaStr } });
    };

    const ejecutarAccionRapida = async (accion) => {
        if (!contextMenu.data) return;
        const { slot, fecha } = contextMenu.data;
        
        setContextMenu({ ...contextMenu, visible: false });

        if (accion === 'AGENDAR' && onAgendarCita) {
            onAgendarCita(slot, fecha);
        } 
        else if (accion === 'CONFIGURAR') {
            onGestionarTurno(slot.turno, fecha);
        } 
        else if (accion === 'BLOQUEAR') {
            const { value: motivo } = await Swal.fire({
                title: 'Bloquear Espacio Rápido',
                input: 'text',
                inputPlaceholder: 'Ej: Almuerzo, Reunión, Permiso...',
                showCancelButton: true,
                confirmButtonText: 'Bloquear',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#ea580c'
            });

            if (motivo !== undefined && onBloquearSlotRapido) {
                const [h, m] = slot.inicio.split(':').map(Number);
                const end = new Date();
                end.setHours(h, m + slot.duracion, 0);
                const finStr = `${end.getHours().toString().padStart(2,'0')}:${end.getMinutes().toString().padStart(2,'0')}`;
                
                onBloquearSlotRapido({
                    profId: slot.profId,
                    fecha: fecha,
                    inicio: slot.inicio,
                    fin: finStr,
                    motivo: motivo || 'Bloqueo manual'
                });
            }
        }
    };

    const renderCeldaTiempo = (fechaColumna, hora, colIndex) => {
        const jsDay = fechaColumna.getDay(); 
        const appDayIndex = jsDay === 0 ? 6 : jsDay - 1; 
        const ahora = new Date();
        
        const y = fechaColumna.getFullYear();
        const m = String(fechaColumna.getMonth() + 1).padStart(2, '0');
        const d = String(fechaColumna.getDate()).padStart(2, '0');
        const fechaColumnaStr = `${y}-${m}-${d}`;

        let allSlots = [];

        selectedProfs.forEach(prof => {
            const agendaProf = agendasCombinadas[prof.id];
            if (!agendaProf || !agendaProf.horarios) return;

            const turnos = agendaProf.horarios.filter(h => {
                if (parseInt(h.profesional_id) !== parseInt(prof.id)) return false;
                if (h.dia_semana !== appDayIndex) return false;
                
                const hInicio = parseInt(h.hora_inicio.split(':')[0]);
                const hFin = parseInt(h.hora_fin.split(':')[0]);
                if (!(hInicio <= hora && hFin > hora)) return false;

                if (h.fecha && h.fecha !== fechaColumnaStr) return false; 
                if (h.fecha_fin_vigencia && fechaColumnaStr > h.fecha_fin_vigencia) return false;
                
                return true;
            });

            turnos.forEach(turno => {
                const infoServicio = getServiceInfo(turno.servicio_id);
                const duracionReal = infoServicio.duracion > 0 ? infoServicio.duracion : duracionDefecto;
                const bufferReal = infoServicio.buffer > 0 ? infoServicio.buffer : 0;
                const tiempoTotal = duracionReal + bufferReal;
                
                const horaInicioTurno = parseInt(turno.hora_inicio.split(':')[0]);
                const minInicioTurno = parseInt(turno.hora_inicio.split(':')[1]);
                let minActual = (hora === horaInicioTurno) ? minInicioTurno : 0;

                while (minActual < 60) {
                    const horaFinTurno = parseInt(turno.hora_fin.split(':')[0]);
                    const minFinTurno = parseInt(turno.hora_fin.split(':')[1]);
                    
                    if (hora > horaFinTurno || (hora === horaFinTurno && minActual >= minFinTurno)) break;

                    const inicioSlotStr = `${hora.toString().padStart(2,'0')}:${minActual.toString().padStart(2,'0')}`;
                    
                    const slotStart = new Date(fechaColumna);
                    slotStart.setHours(hora, minActual, 0, 0);
                    
                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + duracionReal); 

                    const bloqueoEncontrado = agendaProf.bloqueos?.find(b => {
                        const bStart = new Date(b.fecha_inicio);
                        const bEnd = new Date(b.fecha_fin);
                        return slotStart >= bStart && slotStart < bEnd;
                    });

                    const citaEncontrada = agendaProf.citas?.find(c => {
                        if (c.fecha !== fechaColumnaStr || ['CANCELADA', 'RECHAZADA'].includes(c.estado)) return false;
                        const cStart = new Date(`${fechaColumnaStr}T${c.hora_inicio}`);
                        const cEnd = new Date(`${fechaColumnaStr}T${c.hora_fin}`);
                        return (slotStart < cEnd && slotEnd > cStart);
                    });

                    const isBloqueado = !!bloqueoEncontrado;
                    const isPasado = slotStart < ahora;
                    const isAgendado = !!citaEncontrada;

                    allSlots.push({
                        profId: prof.id,
                        profNombre: prof.nombre,
                        profColor: prof.colorInfo,
                        inicio: inicioSlotStr,
                        duracion: duracionReal,
                        buffer: bufferReal,
                        servicioNombre: infoServicio.nombre,
                        isPasado, 
                        isBloqueado, 
                        isAgendado,
                        cita: citaEncontrada,
                        motivoBloqueo: bloqueoEncontrado?.motivo, 
                        turno
                    });
                    
                    minActual += tiempoTotal;
                }
            });
        });

        const isSelectedByDrag = dragSelection && 
                                 dragSelection.dayIndex === colIndex && 
                                 hora >= Math.min(dragSelection.startHour, dragSelection.endHour) && 
                                 hora <= Math.max(dragSelection.startHour, dragSelection.endHour);

        if (allSlots.length === 0) {
            const finDeEstaHora = new Date(fechaColumna);
            finDeEstaHora.setHours(hora + 1, 0, 0, 0);

            if (ahora >= finDeEstaHora) {
                return (
                    <div className="h-full w-full bg-gray-50/50 border-t border-dashed border-gray-100 opacity-40 cursor-not-allowed"></div>
                );
            }

            return (
                <div 
                    className={`h-full w-full flex items-center justify-center transition-all z-10 group select-none border-t border-dashed border-gray-100
                        ${isSelectedByDrag ? 'bg-blue-100 border-blue-300 shadow-inner' : 'hover:bg-gray-50 cursor-pointer'}
                    `}
                    onMouseDown={() => handleMouseDown(colIndex, hora)}
                    onMouseEnter={() => handleMouseEnter(colIndex, hora)}
                    onMouseUp={() => handleMouseUp(fechaColumna)}
                    title="Arrastra para crear bloque o clic simple"
                >
                    {!isSelectedByDrag && <FaPlus size={10} className="text-gray-300 group-hover:text-blue-400 transform group-hover:scale-110 transition-all"/>}
                    {isSelectedByDrag && <span className="text-xs font-bold text-blue-500">{hora}:00</span>}
                </div>
            );
        }

        allSlots.sort((a,b) => a.inicio.localeCompare(b.inicio));

        return (
            <div className="flex flex-col gap-[1px] w-full p-[1px] relative h-full">
                {allSlots.map((slot, idx) => {
                    let containerStyle = "";
                    let iconoEstado = null;
                    let tooltipText = "";
                    let bgColorClass = "";
                    let textColorClass = "";
                    let borderColorClass = "";

                    // CORRECCIÓN: ASIGNACIÓN DINÁMICA DE COLORES
                    // Extraemos las clases base del color del profesional (ej: "bg-blue-100 text-blue-800 border-blue-300")
                    if (slot.profColor) {
                        const parts = slot.profColor.clase.split(' ');
                        bgColorClass = parts[0] || 'bg-gray-50';
                        textColorClass = parts[1] || 'text-gray-700';
                        borderColorClass = parts[2] || 'border-gray-200';
                    }

                    if (slot.isBloqueado) {
                        // Bloqueo: Mantenemos el rojo universal de advertencia
                        containerStyle = "bg-red-50 border-l-[3px] border-red-500 text-red-700 cursor-not-allowed";
                        iconoEstado = <FaLock size={8}/>;
                        tooltipText = `Bloqueado: ${slot.motivoBloqueo}`;
                    } else if (slot.isPasado) {
                        // Pasado: Gris desvanecido
                        containerStyle = "bg-gray-100 border-l-[3px] border-gray-400 text-gray-400 opacity-60 grayscale cursor-not-allowed";
                        iconoEstado = <FaHistory size={8}/>;
                        tooltipText = "Horario finalizado";
                    } else if (slot.isAgendado) {
                        // Agendado (Ocupado): Color FUERTE del profesional
                        containerStyle = `${bgColorClass} border-l-[3px] ${borderColorClass} ${textColorClass} shadow-sm`;
                        iconoEstado = <FaUser size={8}/>;
                        tooltipText = `Cita ocupada - ${slot.cita?.paciente_nombre || 'Paciente'} (Dr. ${slot.profNombre})`;
                    } else {
                        // Libre: Fondo blanco, pero borde y texto con el color del profesional para distinguirlo suavemente
                        const textOnlyClass = textColorClass.replace('text-', 'text-opacity-70 text-'); // Un poco más claro
                        containerStyle = `bg-white border-l-[3px] ${borderColorClass} ${textOnlyClass} hover:${bgColorClass} hover:shadow-sm`;
                        iconoEstado = <FaPlus size={8} className="opacity-50"/>;
                        tooltipText = `Disponible para ${slot.servicioNombre} - Dr. ${slot.profNombre}`;
                    }

                    return (
                        <div 
                            key={`${slot.profId}-${idx}`}
                            className={`flex-1 rounded-sm text-[10px] px-1.5 py-0.5 flex flex-col justify-center transition-all overflow-hidden min-h-[32px] relative group ${containerStyle}`}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (slot.isAgendado) {
                                    Swal.fire('Espacio Ocupado', `Paciente: ${slot.cita?.paciente_nombre || 'Desconocido'}\nMédico: ${slot.profNombre}`, 'info');
                                } else if (!slot.isBloqueado && !slot.isPasado && onAgendarCita) {
                                    onAgendarCita(slot, fechaColumnaStr); 
                                } else {
                                    onGestionarTurno(slot.turno, fechaColumnaStr);
                                }
                            }}
                            onContextMenu={(e) => handleContextMenu(e, slot, fechaColumnaStr)}
                            title={tooltipText}
                        >
                            <div className="flex items-center justify-between w-full leading-tight">
                                <span className="font-mono font-bold">{slot.inicio}</span>
                                <div className="flex items-center gap-1">
                                    {/* Mostrar primera palabra del nombre del Dr. si hay más de 1 médico seleccionado */}
                                    {selectedProfs.length > 1 && (
                                        <span className="text-[8px] opacity-70 uppercase tracking-tighter truncate max-w-[40px]">
                                            {slot.profNombre.split(' ')[0]}
                                        </span>
                                    )}
                                    {iconoEstado}
                                </div>
                            </div>
                            
                            {!slot.isBloqueado && !slot.isPasado && (
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="truncate font-medium w-full text-[9px] leading-none">
                                        {slot.isAgendado ? slot.cita?.paciente_nombre : slot.servicioNombre}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!selectedProfs || selectedProfs.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <FaUser size={40} className="mb-4 opacity-20"/>
            <p>Seleccione profesionales</p>
        </div>
    );
    
    const diasColumna = getDiasColumna();
    
    let gridWidthClass = 'w-full';
    if (calendarView === 'week') gridWidthClass = 'min-w-[800px] md:min-w-full';
    if (calendarView === 'month') gridWidthClass = 'min-w-[2500px]'; 

    return (
        <div className="h-full overflow-auto bg-white relative scrollbar-thin w-full" onMouseLeave={() => { isDragging.current = false; setDragSelection(null); }}>
            
            {/* MENÚ CONTEXTUAL */}
            {contextMenu.visible && contextMenu.data && (
                <div 
                    className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 w-56 py-1 animate-fadeIn"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="px-3 py-2 border-b bg-gray-50 text-xs font-bold text-gray-600 truncate flex flex-col">
                        <span>{contextMenu.data.fecha}</span>
                        <span className="text-blue-600 font-mono text-[10px]">{contextMenu.data.slot.inicio} - Dr. {contextMenu.data.slot.profNombre}</span>
                    </div>
                    
                    {!contextMenu.data.slot.isAgendado && !contextMenu.data.slot.isBloqueado && !contextMenu.data.slot.isPasado && (
                        <button onClick={() => ejecutarAccionRapida('AGENDAR')} className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 font-bold">
                            <FaPlus size={12}/> Agendar Paciente Aquí
                        </button>
                    )}

                    {!contextMenu.data.slot.isBloqueado && !contextMenu.data.slot.isPasado && (
                        <button onClick={() => ejecutarAccionRapida('BLOQUEAR')} className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 font-bold">
                            <FaBan size={12}/> Bloquear este espacio
                        </button>
                    )}

                    <div className="border-t my-1"></div>

                    <button onClick={() => ejecutarAccionRapida('CONFIGURAR')} className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-bold">
                        <FaCogs size={12}/> Configurar Serie Completa
                    </button>
                </div>
            )}

            <div className={`${gridWidthClass} h-full flex flex-col`}>
                <div className="flex border-b bg-gray-50 sticky top-0 z-20 shadow-sm">
                    <div className="w-14 flex-shrink-0 p-2 text-center text-gray-500 text-[10px] border-r bg-white flex items-center justify-center font-bold">HORA</div>
                    {diasColumna.map((fecha, i) => {
                        const esHoy = new Date().toDateString() === fecha.toDateString();
                        const diasSemanaStr = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
                        const isClipboardSource = clipboardDay?.date.toDateString() === fecha.toDateString();
                        
                        return (
                            <div key={i} className={`flex-1 py-2 text-center border-r flex flex-col justify-center relative group transition-colors ${esHoy ? 'bg-blue-50 border-b-2 border-blue-500' : 'hover:bg-gray-100'} ${isClipboardSource ? 'bg-yellow-50 ring-inset ring-2 ring-yellow-300' : ''}`}>
                                <span className={`text-[10px] font-bold uppercase ${esHoy ? 'text-blue-700' : 'text-gray-500'}`}>{diasSemanaStr[fecha.getDay()]}</span>
                                <span className={`text-sm md:text-lg font-light leading-none mt-0.5 ${esHoy ? 'text-blue-900' : 'text-gray-800'}`}>{fecha.getDate()}</span>

                                <div className="absolute top-1 right-1 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!clipboardDay ? (
                                        <button onClick={(e) => { e.stopPropagation(); onCopyDay(fecha); }} className="p-1.5 bg-white shadow-sm border border-gray-200 rounded text-gray-400 hover:text-blue-600 hover:border-blue-400 transition transform hover:scale-110" title="Copiar día completo">
                                            <FaRegCopy size={10} />
                                        </button>
                                    ) : (
                                        !isClipboardSource && (
                                            <button onClick={(e) => { e.stopPropagation(); onPasteDay(fecha); }} className="p-1.5 bg-green-100 shadow-md border border-green-300 rounded text-green-700 hover:bg-green-200 transition animate-pulse" title="Pegar horarios aquí">
                                                <FaPaste size={10} />
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex-1 bg-white select-none"> 
                    {HORAS.map(hora => (
                        <div key={hora} className="flex border-b min-h-[60px] md:min-h-[70px]"> 
                            <div className="w-14 flex-shrink-0 text-center text-gray-400 text-[10px] font-mono border-r bg-gray-50 flex items-center justify-center relative">
                                <span className="-mt-14 block bg-white px-1 z-10 rounded shadow-sm border border-gray-100">{hora}:00</span>
                                <div className="absolute w-full h-[1px] bg-gray-100 top-0 right-0"></div> 
                            </div>
                            {diasColumna.map((fecha, i) => (
                                <div key={i} className="flex-1 border-r p-[1px] relative">
                                    {renderCeldaTiempo(fecha, hora, i)}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GrillaSemanal;