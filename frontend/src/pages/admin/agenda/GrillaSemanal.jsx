import React from 'react';
import { FaPlus, FaClock, FaLock, FaHistory } from 'react-icons/fa';

const GrillaSemanal = ({ 
    selectedProfs = [], 
    agendasCombinadas = {}, 
    servicios, 
    duracionDefecto, 
    onCrearTurno, 
    onGestionarTurno,
    calendarView, 
    fechaReferencia, 
    setCalendarView, 
    setFechaReferencia 
}) => {
    
    // Rango de horas a mostrar (06:00 a 20:00)
    const HORAS = Array.from({ length: 15 }, (_, i) => i + 6); 

    // --- HELPERS DE FECHAS ---
    const getDiasColumna = () => {
        const dias = [];
        const current = new Date(fechaReferencia);

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
                dias.push(d);
            }
        }
        return dias;
    };

    const getServiceInfo = (id) => {
        const s = servicios.find(srv => srv.id === id);
        return s 
            ? { nombre: s.nombre, duracion: s.duracion_minutos } 
            : { nombre: 'General', duracion: duracionDefecto };
    };

    // --- RENDERIZADORES ---

    const renderCeldaTiempo = (fechaColumna, hora) => {
        const jsDay = fechaColumna.getDay(); 
        const appDayIndex = jsDay === 0 ? 6 : jsDay - 1; 
        const ahora = new Date();

        let allSlots = [];

        // Recorremos TODOS los profesionales seleccionados para llenar la celda
        selectedProfs.forEach(prof => {
            const agendaProf = agendasCombinadas[prof.id];
            if (!agendaProf || !agendaProf.horarios) return;

            const turnos = agendaProf.horarios.filter(h => 
                h.dia_semana === appDayIndex && 
                parseInt(h.hora_inicio.split(':')[0]) <= hora && 
                parseInt(h.hora_fin.split(':')[0]) > hora
            );

            turnos.forEach(turno => {
                const infoServicio = getServiceInfo(turno.servicio_id);
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

                    const isBloqueado = agendaProf.bloqueos?.some(b => {
                        const bStart = new Date(b.fecha_inicio);
                        const bEnd = new Date(b.fecha_fin);
                        return slotStart >= bStart && slotStart < bEnd;
                    });

                    allSlots.push({
                        profId: prof.id,
                        profNombre: prof.nombre,
                        profColor: prof.colorInfo,
                        inicio: inicioSlotStr,
                        duracion: infoServicio.duracion,
                        isPasado: slotStart < ahora,
                        isBloqueado,
                        turno
                    });
                    minActual += infoServicio.duracion;
                }
            });
        });

        // CASO A: Celda Totalmente Vacía -> Botón Grande
        if (allSlots.length === 0) {
            return (
                <div 
                    className="h-full w-full flex items-center justify-center text-transparent hover:text-gray-400 hover:bg-gray-50 cursor-pointer border-t border-dashed border-gray-100 transition-all z-10 group"
                    onClick={(e) => {
                        e.stopPropagation();
                        onCrearTurno(appDayIndex, hora);
                    }}
                    title="Clic para agregar disponibilidad"
                >
                    <FaPlus size={12} className="transform group-hover:scale-110 transition-transform"/>
                </div>
            );
        }

        // CASO B: Celda con Datos -> Renderizar slots + Botón Pequeño de Agregar
        allSlots.sort((a,b) => a.inicio.localeCompare(b.inicio));

        return (
            <div className="flex flex-col gap-[2px] w-full p-[1px] relative h-full">
                {/* Lista de Slots Existentes */}
                {allSlots.map((slot, idx) => {
                    let style = `${slot.profColor?.clase || 'bg-gray-100'} opacity-90 hover:opacity-100 hover:shadow-sm`;
                    
                    if (slot.isPasado) style = "bg-gray-100 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed";
                    else if (slot.isBloqueado) style = "bg-red-50 border-red-200 text-red-700 pattern-diagonal-lines";

                    return (
                        <div 
                            key={`${slot.profId}-${idx}`}
                            className={`flex-1 rounded border text-[10px] px-1 flex items-center justify-between cursor-pointer transition overflow-hidden min-h-[20px] ${style}`}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onGestionarTurno(slot.turno, fechaColumna.toISOString().split('T')[0]); 
                            }}
                            title={`${slot.profNombre} - ${slot.inicio}`}
                        >
                            <div className="flex items-center gap-1 overflow-hidden">
                                {selectedProfs.length > 1 && !slot.isPasado && !slot.isBloqueado && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0" title={slot.profNombre}></div>
                                )}
                                <span className="font-mono font-bold truncate">{slot.inicio}</span>
                            </div>
                            {slot.isBloqueado ? <FaLock size={8}/> : (slot.isPasado ? <FaHistory size={8}/> : null)}
                        </div>
                    );
                })}

                {/* --- NUEVO: Botón Mini "+" para agregar OTRO en la misma franja --- */}
                <div 
                    onClick={(e) => { e.stopPropagation(); onCrearTurno(appDayIndex, hora); }}
                    className="mt-1 flex items-center justify-center p-0.5 border border-dashed border-gray-300 rounded text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition"
                    title="Agregar otro profesional en esta hora"
                >
                    <FaPlus size={8} />
                </div>
            </div>
        );
    };

    // --- VISTA MENSUAL ---
    const renderVistaMensual = () => {
        const year = fechaReferencia.getFullYear();
        const month = fechaReferencia.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        let startDayIndex = firstDay.getDay() - 1;
        if (startDayIndex === -1) startDayIndex = 6; 
        const daysInMonth = lastDay.getDate();

        const celdas = [];
        for (let i = 0; i < startDayIndex; i++) celdas.push(<div key={`empty-${i}`} className="bg-gray-50/30 min-h-[100px]"></div>);
        
        for (let d = 1; d <= daysInMonth; d++) {
            const fechaDia = new Date(year, month, d);
            const jsDay = fechaDia.getDay();
            const appDayIndex = jsDay === 0 ? 6 : jsDay - 1;
            
            const indicadores = [];
            selectedProfs.forEach(prof => {
                const agenda = agendasCombinadas[prof.id];
                if (!agenda) return;

                const tieneHorario = agenda.horarios?.some(h => h.dia_semana === appDayIndex && h.activo);
                const tieneBloqueo = agenda.bloqueos?.some(b => {
                    const bStart = new Date(b.fecha_inicio);
                    const bEnd = new Date(b.fecha_fin);
                    return fechaDia >= new Date(bStart.setHours(0,0,0,0)) && fechaDia <= new Date(bEnd.setHours(23,59,59,999));
                });

                if (tieneHorario || tieneBloqueo) {
                    indicadores.push({ 
                        color: prof.colorInfo?.nombre || 'gray', 
                        tipo: tieneBloqueo ? 'bloqueo' : 'horario',
                        nombre: prof.nombre
                    });
                }
            });

            const esHoy = new Date().toDateString() === fechaDia.toDateString();

            celdas.push(
                <div 
                    key={d} 
                    onClick={() => { setFechaReferencia(fechaDia); setCalendarView('day'); }}
                    className={`min-h-[100px] border border-gray-100 p-2 transition cursor-pointer flex flex-col relative hover:bg-blue-50 ${esHoy ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'bg-white'}`}
                >
                    <span className={`text-sm font-bold mb-1 ${esHoy ? 'text-blue-700' : 'text-gray-700'}`}>{d}</span>
                    <div className="flex flex-wrap gap-1 content-start mt-1">
                        {indicadores.map((ind, idx) => (
                            <div 
                                key={idx} 
                                className={`w-2 h-2 rounded-full ${ind.tipo === 'bloqueo' ? 'bg-red-500' : `bg-${ind.color}-500`}`}
                                title={`${ind.nombre} (${ind.tipo})`}
                            ></div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full overflow-y-auto p-4 bg-white w-full">
                <div className="grid grid-cols-7 gap-px mb-1 bg-gray-200 border border-gray-200 rounded-t overflow-hidden">
                    {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => <div key={d} className="bg-gray-50 text-center py-2 text-xs font-bold text-gray-500 uppercase">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 border-t-0 rounded-b overflow-hidden">
                    {celdas}
                </div>
            </div>
        );
    };

    // --- RENDER PRINCIPAL ---
    if (!selectedProfs || selectedProfs.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <FaClock size={40} className="mb-4 opacity-20"/>
                <p>Seleccione al menos un profesional</p>
            </div>
        );
    }

    if (calendarView === 'month') return renderVistaMensual();

    const diasColumna = getDiasColumna();
    
    return (
        <div className="h-full overflow-auto bg-white relative scrollbar-thin w-full">
            <div className={`${calendarView === 'week' ? 'min-w-[1000px]' : 'w-full'} h-full flex flex-col`}>
                <div className="flex border-b bg-gray-50 sticky top-0 z-20 shadow-sm">
                    <div className="w-16 flex-shrink-0 p-2 text-center text-gray-500 text-xs border-r bg-white flex items-center justify-center font-bold">HORA</div>
                    {diasColumna.map((fecha, i) => {
                        const esHoy = new Date().toDateString() === fecha.toDateString();
                        const diasSemanaStr = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
                        return (
                            <div key={i} className={`flex-1 py-2 text-center border-r flex flex-col justify-center ${esHoy ? 'bg-blue-50 border-b-2 border-blue-500' : ''}`}>
                                <span className={`text-[10px] md:text-xs font-bold uppercase ${esHoy ? 'text-blue-700' : 'text-gray-500'}`}>{diasSemanaStr[fecha.getDay()]}</span>
                                <span className={`text-base md:text-lg font-light leading-none mt-1 ${esHoy ? 'text-blue-900' : 'text-gray-800'}`}>{fecha.getDate()}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="flex-1 bg-white"> 
                    {HORAS.map(hora => (
                        <div key={hora} className="flex border-b min-h-[80px]"> 
                            <div className="w-16 flex-shrink-0 text-center text-gray-400 text-xs font-mono border-r bg-gray-50 flex items-center justify-center relative">
                                <span className="-mt-16 block bg-white px-1 z-10 rounded">{hora}:00</span>
                                <div className="absolute w-full h-[1px] bg-gray-200 top-0 right-0"></div> 
                            </div>
                            {diasColumna.map((fecha, i) => (
                                <div key={i} className="flex-1 border-r p-[2px] relative hover:bg-gray-50 transition-colors">
                                    {renderCeldaTiempo(fecha, hora)}
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