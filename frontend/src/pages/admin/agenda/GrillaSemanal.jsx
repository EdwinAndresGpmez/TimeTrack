import React from 'react';
import { FaPlus, FaClock } from 'react-icons/fa';

const GrillaSemanal = ({ profesional, agenda, servicios, duracionDefecto, onCrearTurno, onGestionarTurno }) => {
    
    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const HORAS = Array.from({ length: 15 }, (_, i) => i + 6); 

    const getServiceInfo = (id) => {
        const s = servicios.find(srv => srv.id === id);
        // AQUÍ USAMOS EL PARÁMETRO DINÁMICO
        return s ? { nombre: s.nombre, duracion: s.duracion_minutos } : { nombre: 'General', duracion: duracionDefecto };
    };

    const renderCelda = (diaIndex, hora) => {
        const turnos = agenda.horarios.filter(h => 
            h.dia_semana === diaIndex && 
            parseInt(h.hora_inicio.split(':')[0]) <= hora && 
            parseInt(h.hora_fin.split(':')[0]) > hora
        );

        if (turnos.length > 0) {
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
                    
                    slotsVisuales.push({
                        inicio: inicioSlotStr,
                        duracion: infoServicio.duracion
                    });

                    minActual += infoServicio.duracion;
                }

                return (
                    <div key={turno.id} className="h-full flex flex-col gap-[1px]">
                        {slotsVisuales.map((slot, idx) => (
                            <div 
                                key={idx}
                                // Aquí añadimos clases para que se vea claramente "seccionado"
                                className="bg-blue-50 text-blue-800 text-[9px] p-1 rounded border-l-2 border-blue-500 cursor-pointer hover:bg-blue-100 transition relative flex items-center justify-between shadow-sm h-full"
                                onClick={() => onGestionarTurno(turno)}
                                title={`Gestionar: ${infoServicio.nombre}`}
                            >
                                <span className="font-mono font-bold">{slot.inicio}</span>
                                {idx === 0 && <span className="text-[8px] uppercase truncate opacity-50 hidden md:block">{infoServicio.nombre}</span>}
                            </div>
                        ))}
                    </div>
                );
            });
        }

        return (
            <div 
                className="h-full w-full hover:bg-gray-100 cursor-pointer flex items-center justify-center text-transparent hover:text-gray-400 transition border-t border-dashed border-gray-200"
                onClick={() => onCrearTurno(diaIndex, hora)}
            >
                <FaPlus size={10}/>
            </div>
        );
    };

    if (!profesional) return <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50"><p>Seleccione profesional</p></div>;

    return (
        <div className="flex-1 overflow-auto bg-white relative scrollbar-thin">
            <div className="min-w-[800px]">
                <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0 z-20">
                    <div className="p-2 text-center text-gray-500 text-xs border-r">HORA</div>
                    {DIAS.map((dia, i) => (
                        <div key={i} className="p-2 text-center text-gray-700 font-bold text-xs border-r uppercase">{dia}</div>
                    ))}
                </div>
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