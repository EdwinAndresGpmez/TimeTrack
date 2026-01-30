import React, { useEffect } from 'react';
import { FaPlus, FaLock, FaHistory, FaUser } from 'react-icons/fa';

const GrillaSemanal = ({ 
    selectedProfs = [], 
    agendasCombinadas = {}, 
    servicios, 
    duracionDefecto, 
    onCrearTurno, 
    onGestionarTurno,
    calendarView, 
    fechaReferencia,
    setCalendarView 
}) => {
    
    // --- ESTRATEGIA RESPONSIVA (Hook de Efecto) ---
    // Si la pantalla es pequeña (móvil), forzamos la vista "Día" automáticamente.
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768 && calendarView === 'week') {
                if(setCalendarView) setCalendarView('day');
            }
        };
        // Ejecutar al montar
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [calendarView, setCalendarView]);

    const HORAS = Array.from({ length: 15 }, (_, i) => i + 6); // 6:00 a 20:00

    const getDiasColumna = () => {
        const dias = [];
        const current = new Date(fechaReferencia);
        current.setHours(0, 0, 0, 0);

        if (calendarView === 'day') {
            dias.push(new Date(current));
        } 
        else if (calendarView === 'week') {
            const diaSemana = current.getDay(); 
            // Ajuste Lunes(1) como inicio.
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
        return dias;
    };

    const getServiceInfo = (id) => {
        const s = servicios.find(srv => srv.id === id);
        return s ? { nombre: s.nombre, duracion: s.duracion_minutos } : { nombre: 'General', duracion: duracionDefecto };
    };

    const renderCeldaTiempo = (fechaColumna, hora) => {
        const jsDay = fechaColumna.getDay(); 
        const appDayIndex = jsDay === 0 ? 6 : jsDay - 1; 
        const ahora = new Date();
        
        // Generamos strings YYYY-MM-DD para comparaciones de fecha exactas
        const y = fechaColumna.getFullYear();
        const m = String(fechaColumna.getMonth() + 1).padStart(2, '0');
        const d = String(fechaColumna.getDate()).padStart(2, '0');
        const fechaColumnaStr = `${y}-${m}-${d}`;

        let allSlots = [];

        selectedProfs.forEach(prof => {
            const agendaProf = agendasCombinadas[prof.id];
            if (!agendaProf || !agendaProf.horarios) return;

            // 1. FILTRADO DE HORARIOS VÁLIDOS (Vigencia + Día + Hora)
            const turnos = agendaProf.horarios.filter(h => {
                if (parseInt(h.profesional_id) !== parseInt(prof.id)) {
                return false;
            }
                // A. Coincidencia de Día de Semana
                if (h.dia_semana !== appDayIndex) return false;

                // B. Coincidencia de Hora (el turno debe "tocar" esta hora)
                const hInicio = parseInt(h.hora_inicio.split(':')[0]);
                const hFin = parseInt(h.hora_fin.split(':')[0]);
                if (!(hInicio <= hora && hFin > hora)) return false;

                // C. COINCIDENCIA DE FECHA ESPECÍFICA (Override)
                if (h.fecha && h.fecha !== fechaColumnaStr) {
                    return false; 
                }

                // D. VALIDACIÓN DE VIGENCIA (CRÍTICO PARA "ELIMINAR SERIE")
                // Si el turno tiene fecha fin de vigencia, y la columna es POSTERIOR a esa fecha, no mostrar.
                if (h.fecha_fin_vigencia) {
                    if (fechaColumnaStr > h.fecha_fin_vigencia) {
                        return false; // Ya caducó esta serie
                    }
                }
                
                return true;
            });

            turnos.forEach(turno => {
                const infoServicio = getServiceInfo(turno.servicio_id);
                const duracionReal = infoServicio.duracion > 0 ? infoServicio.duracion : duracionDefecto;
                
                const horaInicioTurno = parseInt(turno.hora_inicio.split(':')[0]);
                const minInicioTurno = parseInt(turno.hora_inicio.split(':')[1]);
                let minActual = (hora === horaInicioTurno) ? minInicioTurno : 0;

                while (minActual < 60) {
                    const horaFinTurno = parseInt(turno.hora_fin.split(':')[0]);
                    const minFinTurno = parseInt(turno.hora_fin.split(':')[1]);
                    
                    if (hora > horaFinTurno || (hora === horaFinTurno && minActual >= minFinTurno)) break;

                    const inicioSlotStr = `${hora.toString().padStart(2,'0')}:${minActual.toString().padStart(2,'0')}`;
                    
                    // Calcular fecha/hora exacta del slot
                    const slotStart = new Date(fechaColumna);
                    slotStart.setHours(hora, minActual, 0, 0);

                    // --- 2. DETECCIÓN DE BLOQUEOS ("SOLO POR HOY") ---
                    const bloqueoEncontrado = agendaProf.bloqueos?.find(b => {
                        const bStart = new Date(b.fecha_inicio);
                        const bEnd = new Date(b.fecha_fin);
                        return slotStart >= bStart && slotStart < bEnd;
                    });

                    const isBloqueado = !!bloqueoEncontrado;
                    const isPasado = slotStart < ahora;

                    // --- 3. PUSH AL ARRAY ---
                    // Agregamos el slot incluso si está bloqueado, para pintarlo de rojo.
                    allSlots.push({
                        profId: prof.id,
                        profNombre: prof.nombre,
                        profColor: prof.colorInfo,
                        inicio: inicioSlotStr,
                        duracion: duracionReal,
                        servicioNombre: infoServicio.nombre,
                        isPasado, 
                        isBloqueado, // Flag para pintar rojo
                        motivoBloqueo: bloqueoEncontrado?.motivo, 
                        turno // Datos originales para gestión
                    });
                    
                    minActual += duracionReal;
                }
            });
        });

        // --- 4. RENDERIZADO DE HUECOS VACÍOS (VALIDACIÓN DE PASADO) ---
        if (allSlots.length === 0) {
            // Calculamos el final de esta hora para saber si ya pasó completamente
            const finDeEstaHora = new Date(fechaColumna);
            finDeEstaHora.setHours(hora + 1, 0, 0, 0);

            // Si "ahora" es mayor que el fin de la hora, es pasado -> BLOQUEAR CREACIÓN
            if (ahora >= finDeEstaHora) {
                return (
                    <div 
                        className="h-full w-full flex items-center justify-center bg-gray-50 border-t border-dashed border-gray-100 opacity-40 cursor-not-allowed transition-colors"
                        title="Hora pasada - No se puede agendar"
                    >
                        {/* Espacio vacío gris, sin evento onClick */}
                    </div>
                );
            }

            // Si es futuro -> BOTÓN +
            return (
                <div 
                    className="h-full w-full flex items-center justify-center text-transparent hover:text-gray-300 hover:bg-gray-50 cursor-pointer border-t border-dashed border-gray-100 transition-all z-10 group"
                    onClick={(e) => { e.stopPropagation(); onCrearTurno(fechaColumna, hora); }}
                    title="Crear nuevo turno"
                >
                    <FaPlus size={10} className="transform group-hover:scale-110 transition-transform"/>
                </div>
            );
        }

        allSlots.sort((a,b) => a.inicio.localeCompare(b.inicio));

        return (
            <div className="flex flex-col gap-[2px] w-full p-[1px] relative h-full">
                {allSlots.map((slot, idx) => {
                    // --- LÓGICA DE ESTILOS ---
                    let containerStyle = "";
                    let iconoEstado = null;
                    let tooltipText = "";

                    if (slot.isBloqueado) {
                        // BLOQUEADO: Rojo
                        containerStyle = "flex-1 rounded-r-sm text-[10px] px-1.5 py-0.5 flex flex-col justify-center cursor-pointer transition overflow-hidden min-h-[34px] shadow-sm bg-red-50 border-l-[4px] border-red-500 text-red-700 opacity-90 hover:opacity-100";
                        iconoEstado = <FaLock size={9} title="Espacio Bloqueado"/>;
                        tooltipText = `🔒 BLOQUEADO\nMotivo: ${slot.motivoBloqueo || 'Sin motivo'}\nClic para desbloquear`;
                    } else if (slot.isPasado) {
                        // PASADO: Gris
                        containerStyle = "flex-1 rounded-r-sm text-[10px] px-1.5 py-0.5 flex flex-col justify-center cursor-pointer transition overflow-hidden min-h-[34px] shadow-sm bg-gray-100 border-l-[4px] border-gray-400 text-gray-400 opacity-60 grayscale";
                        iconoEstado = <FaHistory size={9} title="Tiempo pasado"/>;
                        tooltipText = "Tiempo pasado";
                    } else {
                        // DISPONIBLE: Color del médico
                        let bgClass = slot.profColor?.clase.split(' ')[0] || 'bg-gray-100'; 
                        let borderClass = slot.profColor?.clase.split(' ')[2] || 'border-gray-300';
                        let textClass = slot.profColor?.clase.split(' ')[1] || 'text-gray-700';
                        containerStyle = `flex-1 rounded-r-sm text-[10px] px-1.5 py-0.5 flex flex-col justify-center cursor-pointer transition overflow-hidden min-h-[34px] shadow-sm hover:shadow-md border-l-[4px] ${bgClass} ${borderClass} ${textClass} opacity-95 hover:opacity-100`;
                        tooltipText = `✅ DISPONIBLE\n${slot.servicioNombre}`;
                    }

                    return (
                        <div 
                            key={`${slot.profId}-${idx}`}
                            className={containerStyle}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                // Permitimos click incluso en pasado para ver detalles, 
                                // pero la gestión ya la maneja el componente padre.
                                onGestionarTurno(slot.turno, fechaColumnaStr); 
                            }}
                            title={tooltipText}
                        >
                            <div className="flex items-center justify-between w-full leading-tight">
                                <span className="font-mono font-bold text-[11px]">{slot.inicio}</span>
                                {iconoEstado}
                            </div>
                            
                            {!slot.isBloqueado && !slot.isPasado && (
                                <div className="mt-[1px]">
                                    <span className="truncate opacity-90 text-[9px] font-semibold block w-full whitespace-nowrap overflow-hidden text-ellipsis">
                                        {selectedProfs.length > 1 ? slot.profNombre.split(' ')[0] : slot.servicioNombre.slice(0,12)}
                                    </span>
                                </div>
                            )}
                            
                            {slot.isBloqueado && (
                                <span className="text-[9px] font-bold italic opacity-80 mt-[-2px]">Bloqueado</span>
                            )}
                        </div>
                    );
                })}
                
                {/* Botón flotante pequeño para agregar turno simultáneo (SOLO SI ES FUTURO) */}
                {(() => {
                    const finDeEstaHora = new Date(fechaColumna);
                    finDeEstaHora.setHours(hora + 1, 0, 0, 0);
                    const ahora = new Date();
                    
                    if (ahora < finDeEstaHora) {
                        return (
                            <div 
                                onClick={(e) => { e.stopPropagation(); onCrearTurno(fechaColumna, hora); }}
                                className="mt-1 flex items-center justify-center p-0.5 border border-dashed border-gray-300 rounded text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition opacity-0 group-hover:opacity-100"
                                title="Agregar turno simultáneo"
                            >
                                <FaPlus size={8} />
                            </div>
                        );
                    }
                    return null;
                })()}
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
    
    return (
        <div className="h-full overflow-auto bg-white relative scrollbar-thin w-full">
            <div className={`${calendarView === 'week' ? 'min-w-[700px] md:min-w-full' : 'w-full'} h-full flex flex-col`}>
                
                {/* HEADERS */}
                <div className="flex border-b bg-gray-50 sticky top-0 z-20 shadow-sm">
                    <div className="w-14 flex-shrink-0 p-2 text-center text-gray-500 text-[10px] border-r bg-white flex items-center justify-center font-bold">HORA</div>
                    {diasColumna.map((fecha, i) => {
                        const esHoy = new Date().toDateString() === fecha.toDateString();
                        const diasSemanaStr = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB']; 
                        return (
                            <div key={i} className={`flex-1 py-2 text-center border-r flex flex-col justify-center ${esHoy ? 'bg-blue-50 border-b-2 border-blue-500' : ''}`}>
                                <span className={`text-[10px] font-bold uppercase ${esHoy ? 'text-blue-700' : 'text-gray-500'}`}>{diasSemanaStr[fecha.getDay()]}</span>
                                <span className={`text-sm md:text-lg font-light leading-none mt-0.5 ${esHoy ? 'text-blue-900' : 'text-gray-800'}`}>{fecha.getDate()}</span>
                            </div>
                        );
                    })}
                </div>

                {/* BODY */}
                <div className="flex-1 bg-white"> 
                    {HORAS.map(hora => (
                        <div key={hora} className="flex border-b min-h-[60px] md:min-h-[70px] group"> 
                            {/* Columna Hora */}
                            <div className="w-14 flex-shrink-0 text-center text-gray-400 text-[10px] font-mono border-r bg-gray-50 flex items-center justify-center relative">
                                <span className="-mt-14 block bg-white px-1 z-10 rounded shadow-sm border border-gray-100">{hora}:00</span>
                                <div className="absolute w-full h-[1px] bg-gray-100 top-0 right-0"></div> 
                            </div>
                            {/* Celdas */}
                            {diasColumna.map((fecha, i) => (
                                <div key={i} className="flex-1 border-r p-[1px] relative hover:bg-gray-50 transition-colors">
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