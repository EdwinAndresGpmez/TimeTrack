import React from 'react';
import { FaPlus, FaClock, FaLock, FaHistory } from 'react-icons/fa';

const GrillaSemanal = ({ profesional, agenda, servicios, duracionDefecto, onCrearTurno, onGestionarTurno }) => {
    
    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const HORAS = Array.from({ length: 15 }, (_, i) => i + 6); // 06:00 a 20:00

    // --- HELPER: Calcular fecha de la columna para la semana actual ---
    const getFechaDeLaSemana = (diaIndex) => {
        const hoy = new Date();
        const diaSemanaActual = hoy.getDay(); // 0=Domingo, 1=Lunes
        
        // Mapear índice de JS (0=Dom) a nuestro índice (0=Lun, 6=Dom)
        const jsIndexToApp = { 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 0:6 };
        const hoyAppIndex = jsIndexToApp[diaSemanaActual];

        const diferenciaDias = diaIndex - hoyAppIndex;
        const fechaColumna = new Date(hoy);
        fechaColumna.setDate(hoy.getDate() + diferenciaDias);
        
        return fechaColumna;
    };

    const getServiceInfo = (id) => {
        const s = servicios.find(srv => srv.id === id);
        return s ? { nombre: s.nombre, duracion: s.duracion_minutos } : { nombre: 'General', duracion: duracionDefecto };
    };

    const renderCelda = (diaIndex, hora) => {
        // 1. Filtrar turnos recurrentes
        const turnos = agenda.horarios.filter(h => 
            h.dia_semana === diaIndex && 
            parseInt(h.hora_inicio.split(':')[0]) <= hora && 
            parseInt(h.hora_fin.split(':')[0]) > hora
        );

        if (turnos.length > 0) {
            // Obtenemos la fecha real de esta columna para comparar bloqueos y tiempo pasado
            const fechaBase = getFechaDeLaSemana(diaIndex);
            const ahora = new Date();

            return turnos.map((turno) => {
                const infoServicio = getServiceInfo(turno.servicio_id);
                const horaInicioTurno = parseInt(turno.hora_inicio.split(':')[0]);
                const minInicioTurno = parseInt(turno.hora_inicio.split(':')[1]);
                
                const slotsVisuales = [];
                let minActual = (hora === horaInicioTurno) ? minInicioTurno : 0;
                
                while (minActual < 60) {
                    const horaFinTurno = parseInt(turno.hora_fin.split(':')[0]);
                    const minFinTurno = parseInt(turno.hora_fin.split(':')[1]);
                    
                    if (hora > horaFinTurno || (hora === horaFinTurno && minActual >= minFinTurno)) break;

                    const inicioSlotStr = `${hora.toString().padStart(2,'0')}:${minActual.toString().padStart(2,'0')}`;
                    
                    // --- LÓGICA DE ESTADOS ---
                    
                    // 1. Construir fecha exacta del slot
                    const slotStart = new Date(fechaBase);
                    slotStart.setHours(hora, minActual, 0, 0);
                    
                    // 2. Verificar si es Pasado
                    const isPasado = slotStart < ahora;

                    // 3. Verificar si está Bloqueado (Cruce con agenda.bloqueos)
                    const isBloqueado = agenda.bloqueos.some(b => {
                        const bStart = new Date(b.fecha_inicio);
                        const bEnd = new Date(b.fecha_fin);
                        // Verificar superposición simple
                        return slotStart >= bStart && slotStart < bEnd;
                    });

                    slotsVisuales.push({
                        inicio: inicioSlotStr,
                        duracion: infoServicio.duracion,
                        isPasado,
                        isBloqueado
                    });

                    minActual += infoServicio.duracion;
                }

                return (
                    <div key={turno.id} className="h-full flex flex-col gap-[1px]">
                        {slotsVisuales.map((slot, idx) => {
                            
                            // Definir estilos según estado
                            let containerClass = "bg-blue-50 text-blue-800 border-blue-500 hover:bg-blue-100"; // Disponible (Default)
                            let icon = null;

                            if (slot.isPasado) {
                                containerClass = "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-70";
                                icon = <FaHistory size={8} />;
                            } else if (slot.isBloqueado) {
                                containerClass = "bg-red-50 text-red-700 border-red-400 hover:bg-red-100";
                                icon = <FaLock size={8} />;
                            }

                            return (
                                <div 
                                    key={idx}
                                    className={`${containerClass} text-[9px] p-1 rounded border-l-2 cursor-pointer transition relative flex items-center justify-between shadow-sm h-full`}
                                    onClick={() => onGestionarTurno(turno, getFechaDeLaSemana(diaIndex).toISOString().split('T')[0])}
                                    title={slot.isBloqueado ? "Espacio Bloqueado" : slot.isPasado ? "Tiempo Pasado" : `Gestionar: ${infoServicio.nombre}`}
                                >
                                    <span className="font-mono font-bold">{slot.inicio}</span>
                                    
                                    <div className="flex items-center gap-1">
                                        {idx === 0 && !slot.isBloqueado && !slot.isPasado && (
                                            <span className="text-[8px] uppercase truncate opacity-50 hidden md:block max-w-[40px]">
                                                {infoServicio.nombre}
                                            </span>
                                        )}
                                        {icon}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            });
        }

        return (
            <div 
                className="h-full w-full hover:bg-gray-100 cursor-pointer flex items-center justify-center text-transparent hover:text-gray-400 transition border-t border-dashed border-gray-200"
                onClick={() => onCrearTurno(diaIndex, hora)}
                title="Crear turno"
            >
                <FaPlus size={10}/>
            </div>
        );
    };

    if (!profesional) return <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50"><p>Seleccione profesional</p></div>;

    return (
        <div className="flex-1 overflow-auto bg-white relative scrollbar-thin">
            <div className="min-w-[800px]">
                {/* Cabecera Días */}
                <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0 z-20">
                    <div className="p-2 text-center text-gray-500 text-xs border-r bg-white flex items-center justify-center">HORA</div>
                    {DIAS.map((dia, i) => {
                        const fechaColumna = getFechaDeLaSemana(i);
                        const esHoy = new Date().toDateString() === fechaColumna.toDateString();
                        
                        return (
                            <div key={i} className={`p-2 text-center border-r uppercase flex flex-col justify-center ${esHoy ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                <span className={`text-xs font-bold ${esHoy ? 'text-blue-700' : 'text-gray-700'}`}>{dia}</span>
                                <span className="text-[10px] text-gray-400">{fechaColumna.getDate()}/{fechaColumna.getMonth()+1}</span>
                            </div>
                        );
                    })}
                </div>
                {/* Cuerpo */}
                {HORAS.map(hora => (
                    <div key={hora} className="grid grid-cols-8 border-b min-h-[60px]"> 
                        <div className="text-center text-gray-400 text-xs font-mono border-r bg-gray-50 flex items-center justify-center">
                            {hora}:00
                        </div>
                        {DIAS.map((_, diaIndex) => (
                            <div key={diaIndex} className="border-r p-[2px] relative">
                                {renderCelda(diaIndex, hora)}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GrillaSemanal;