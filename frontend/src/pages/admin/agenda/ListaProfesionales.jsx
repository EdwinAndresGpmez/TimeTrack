import React from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaSearch, FaCheck, FaExternalLinkAlt } from 'react-icons/fa';

const ListaProfesionales = ({ 
    sedes, profesionales, 
    sedeSeleccionada, setSedeSeleccionada, 
    selectedProfs, toggleProfesional,
    onOpenModal 
}) => {
    
    return (
        <div className="w-full bg-white flex flex-col h-full">
            {/* Header Sidebar */}
            <div className="p-4 bg-blue-900 text-white shrink-0">
                <h2 className="font-bold flex items-center gap-2"><FaCalendarAlt/> Staff Médico</h2>
                <p className="text-xs text-blue-200 mt-1">Selecciona uno o varios para comparar</p>
            </div>
            
            {/* Filtros */}
            <div className="p-3 border-b bg-gray-50 shrink-0 space-y-2">
                <select 
                    className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    value={sedeSeleccionada || ''}
                    onChange={(e) => setSedeSeleccionada(e.target.value)}
                >
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <div className="relative">
                    <FaSearch className="absolute left-3 top-2.5 text-gray-300 text-xs"/>
                    <input type="text" placeholder="Filtrar..." className="w-full pl-8 p-1.5 text-xs border rounded"/>
                </div>
            </div>

            {/* Lista Scrollable */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {profesionales.map(prof => {
                    // Verificamos si está seleccionado
                    const selection = selectedProfs.find(p => p.id === prof.id);
                    const isSelected = !!selection;
                    
                    return (
                        <div 
                            key={prof.id}
                            onClick={() => toggleProfesional(prof)}
                            className={`
                                p-2 rounded-lg cursor-pointer border transition flex items-center gap-3 relative
                                ${isSelected 
                                    ? `bg-blue-50 border-blue-400 ring-1 ring-blue-400` 
                                    : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-blue-200'}
                            `}
                        >
                            {/* Avatar con indicador de color si está seleccionado */}
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0 transition-colors
                                ${isSelected ? 'text-white' : 'bg-gray-200 text-gray-500'}
                            `}
                            style={isSelected ? { backgroundColor: selection.colorInfo.nombre } : {}} // Fallback simple
                            >
                                {isSelected ? <FaCheck/> : prof.nombre.charAt(0)}
                            </div>
                            
                            <div className="overflow-hidden flex-1">
                                <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                    {prof.nombre}
                                </h4>
                                <p className="text-[10px] text-gray-500 truncate">{prof.especialidades_nombres?.[0]}</p>
                            </div>

                            {/* Indicador visual de color de la paleta (Tailwind class) */}
                            {isSelected && (
                                <div className={`w-3 h-3 rounded-full absolute top-2 right-2 border border-white shadow-sm ${selection.colorInfo.clase.split(' ')[0]}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer con Botón de Acción Principal */}
            <div className="p-3 border-t bg-gray-50 shrink-0">
                <button 
                    onClick={onOpenModal}
                    disabled={selectedProfs.length === 0}
                    className={`
                        w-full py-2 px-4 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-all
                        ${selectedProfs.length > 0 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 translate-y-0' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                    `}
                >
                    <FaExternalLinkAlt size={12}/> 
                    Ver Agenda Combinada
                </button>
            </div>
        </div>
    );
};

export default ListaProfesionales;