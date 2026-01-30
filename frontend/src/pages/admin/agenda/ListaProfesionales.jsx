import React, { useState } from 'react';
import { FaCalendarAlt, FaSearch, FaCheck, FaExternalLinkAlt, FaChevronLeft, FaUserMd } from 'react-icons/fa';

const ListaProfesionales = ({ 
    sedes, profesionales, 
    sedeSeleccionada, setSedeSeleccionada, 
    selectedProfs, toggleProfesional,
    onOpenModal 
}) => {
    
    // Estado local para colapsar el menú
    const [isOpen, setIsOpen] = useState(true);

    return (
        // Contenedor Externo Animado
        // Si está cerrado, w-0. Si está abierto, w-80 (en desktop) o w-full (en móvil si quisieras, aquí lo dejaremos fijo para no tapar todo)
        <div className={`h-full flex flex-col transition-all duration-300 ease-in-out relative bg-white border-r border-gray-200 ${isOpen ? 'w-80' : 'w-0'}`}>
            
            {/* BOTÓN TOGGLE FLOTANTE 
                - absolute: Se sale del flujo para no depender del ancho del padre
                - -right-8: Se posiciona a la derecha del borde del sidebar
            */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    absolute top-4 -right-10 z-50 
                    w-10 h-10 
                    bg-blue-600 text-white 
                    rounded-r-lg shadow-md border-y border-r border-blue-700
                    flex items-center justify-center 
                    hover:bg-blue-700 transition-colors cursor-pointer
                    focus:outline-none
                `}
                title={isOpen ? "Ocultar panel" : "Mostrar médicos"}
            >
                {isOpen ? <FaChevronLeft /> : <FaUserMd size={20}/>}
            </button>

            {/* CONTENIDO INTERNO (Para evitar deformación al cerrar) */}
            <div className={`h-full w-80 flex flex-col overflow-hidden transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                
                {/* Header Sidebar */}
                <div className="p-4 bg-blue-900 text-white shrink-0">
                    <h2 className="font-bold flex items-center gap-2"><FaCalendarAlt/> Staff Médico</h2>
                    <p className="text-xs text-blue-200 mt-1">Selecciona para gestionar</p>
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
                        <input type="text" placeholder="Filtrar nombre..." className="w-full pl-8 p-1.5 text-xs border rounded outline-none focus:border-blue-400 transition"/>
                    </div>
                </div>

                {/* Lista Scrollable */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                    {profesionales.map(prof => {
                        const selection = selectedProfs.find(p => p.id === prof.id);
                        const isSelected = !!selection;
                        
                        return (
                            <div 
                                key={prof.id}
                                onClick={() => toggleProfesional(prof)}
                                className={`
                                    p-2 rounded-lg cursor-pointer border transition flex items-center gap-3 relative group
                                    ${isSelected 
                                        ? `bg-blue-50 border-blue-400 ring-1 ring-blue-400` 
                                        : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-blue-200'}
                                `}
                            >
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0 transition-colors
                                    ${isSelected ? 'text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}
                                `}
                                style={isSelected ? { backgroundColor: selection.colorInfo.nombre === 'blue' ? '#3b82f6' : selection.colorInfo.nombre } : {}} 
                                >
                                    {isSelected ? <FaCheck/> : prof.nombre.charAt(0)}
                                </div>
                                
                                <div className="overflow-hidden flex-1">
                                    <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                        {prof.nombre}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 truncate">{prof.especialidades_nombres?.[0] || 'General'}</p>
                                </div>

                                {isSelected && (
                                    <div className={`w-3 h-3 rounded-full absolute top-2 right-2 border border-white shadow-sm ${selection.colorInfo.clase.split(' ')[0]}`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-3 border-t bg-gray-50 shrink-0">
                    <button 
                        onClick={onOpenModal}
                        disabled={selectedProfs.length === 0}
                        className={`
                            w-full py-2 px-4 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 transition-all text-sm
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
        </div>
    );
};

export default ListaProfesionales;