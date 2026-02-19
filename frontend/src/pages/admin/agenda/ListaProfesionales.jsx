import React, { useState } from 'react';
import { 
    FaCalendarAlt, FaSearch, FaCheck, FaExternalLinkAlt, 
    FaChevronLeft, FaChevronRight, FaUserMd, FaLightbulb 
} from 'react-icons/fa';

const ListaProfesionales = ({ 
    sedes, profesionales, 
    sedeSeleccionada, setSedeSeleccionada, 
    selectedProfs, toggleProfesional,
    onOpenModal 
}) => {
    
    // Estado local para colapsar el menú
    const [isOpen, setIsOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // CORRECCIÓN HU07: Filtro estricto combinado (Búsqueda + Sede)
    const profesionalesFiltrados = profesionales.filter(p => {
        // 1. Condición de búsqueda por texto
        const coincideTexto = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (p.especialidades_nombres?.[0] || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        // 2. Condición de Sede (lugares_atencion debe incluir la sede seleccionada)
        // Si no hay sede seleccionada, mostramos todos (por seguridad).
        const coincideSede = !sedeSeleccionada || 
                             (p.lugares_atencion && p.lugares_atencion.includes(parseInt(sedeSeleccionada)));

        return coincideTexto && coincideSede;
    });

    return (
        // CONTENEDOR PRINCIPAL
        <div 
            className={`
                h-full flex flex-col transition-all duration-300 ease-in-out bg-white border-r border-gray-200 shadow-xl z-20 
                ${isOpen ? 'w-80' : 'w-16'}
            `}
        >
            
            {/* --- CABECERA (HEADER) --- */}
            <div className={`
                shrink-0 bg-gradient-to-r from-blue-900 to-blue-800 text-white flex items-center transition-all duration-300
                ${isOpen ? 'p-5 justify-between' : 'p-2 justify-center py-4'}
            `}>
                
                {/* Título (Solo visible si abierto) */}
                {isOpen && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <h2 className="font-bold flex items-center gap-2 text-lg tracking-tight">
                            <FaCalendarAlt className="text-blue-300"/> Staff
                        </h2>
                        <p className="text-[10px] text-blue-200 opacity-80">Gestión de Agenda</p>
                    </div>
                )}

                {/* BOTÓN DE COLAPSAR / EXPANDIR (Integrado, no flotante) */}
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        text-white hover:bg-white/20 rounded-lg transition-colors p-2
                        ${!isOpen ? 'w-10 h-10 flex items-center justify-center' : ''}
                    `}
                    title={isOpen ? "Contraer panel" : "Expandir panel"}
                >
                    {isOpen ? <FaChevronLeft /> : <FaChevronRight size={20}/>}
                </button>
            </div>

            {/* --- CONTENIDO PRINCIPAL (Solo visible si abierto) --- */}
            {isOpen && (
                <>
                    {/* Filtros */}
                    <div className="p-4 border-b bg-gray-50 shrink-0 space-y-3 animate-fadeIn">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Sede / Lugar</label>
                            <select 
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={sedeSeleccionada || ''}
                                onChange={(e) => {
                                    setSedeSeleccionada(e.target.value);
                                    // Opcional: Podrías limpiar selectedProfs aquí si quieres que al cambiar de sede se desmarquen los médicos
                                }}
                            >
                                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs"/>
                            <input 
                                type="text" 
                                placeholder="Buscar médico..." 
                                className="w-full pl-9 p-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Lista Scrollable */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 animate-fadeIn">
                        {profesionalesFiltrados.length === 0 ? (
                            <div className="text-center p-4 text-gray-400 text-sm italic">
                                Sin resultados en esta sede.
                            </div>
                        ) : (
                            profesionalesFiltrados.map(prof => {
                                const selection = selectedProfs.find(p => p.id === prof.id);
                                const isSelected = !!selection;
                                
                                return (
                                    <div 
                                        key={prof.id}
                                        onClick={() => toggleProfesional(prof)}
                                        className={`
                                            p-3 rounded-xl cursor-pointer border transition-all duration-200 flex items-center gap-3 relative group
                                            ${isSelected 
                                                ? `bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-200` 
                                                : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'}
                                        `}
                                    >
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner shrink-0 transition-all duration-300
                                            ${isSelected ? 'text-white scale-110' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500'}
                                        `}
                                        style={isSelected ? { backgroundColor: selection.colorInfo.nombre === 'blue' ? '#3b82f6' : selection.colorInfo.nombre } : {}} 
                                        >
                                            {isSelected ? <FaCheck size={12}/> : prof.nombre.charAt(0)}
                                        </div>
                                        
                                        <div className="overflow-hidden flex-1">
                                            <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                                {prof.nombre}
                                            </h4>
                                            <p className="text-[11px] text-gray-500 truncate font-medium">
                                                {prof.especialidades_nombres?.[0] || 'General'}
                                            </p>
                                        </div>

                                        {isSelected && (
                                            <div className={`w-2.5 h-2.5 rounded-full absolute top-3 right-3 border border-white shadow-sm ${selection.colorInfo.clase.split(' ')[0]}`}></div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer con Tips y Acción */}
                    <div className="p-4 border-t bg-gray-50 shrink-0 animate-fadeIn">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-[10px] text-yellow-800 shadow-sm leading-tight">
                            <div className="font-bold flex items-center gap-1 mb-1 text-yellow-900 text-xs">
                                <FaLightbulb className="text-yellow-600"/> Tips:
                            </div>
                            <p>• <b>Clic derecho</b> para editar.</p>
                            <p>• <b>Arrastra</b> para crear.</p>
                            <p>• Usa <b>Copiar/Pegar</b> en días.</p>
                        </div>

                        <button 
                            onClick={onOpenModal}
                            disabled={selectedProfs.length === 0}
                            className={`
                                w-full py-3 px-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all text-sm
                                ${selectedProfs.length > 0 
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:-translate-y-0.5' 
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                            `}
                        >
                            <FaExternalLinkAlt size={12}/> 
                            {selectedProfs.length > 0 ? `Ver Agenda (${selectedProfs.length})` : 'Ver Agenda'}
                        </button>
                    </div>
                </>
            )}

            {/* --- ESTADO CERRADO (MINI BARRA) --- */}
            {!isOpen && (
                <div className="flex-1 flex flex-col items-center py-4 bg-gray-50 space-y-4 animate-fadeIn">
                    {/* Iconos de médicos seleccionados (Miniaturas) */}
                    {selectedProfs.map(prof => (
                        <div 
                            key={prof.id}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md cursor-pointer hover:scale-110 transition-transform relative group"
                            style={{ backgroundColor: prof.colorInfo.nombre === 'blue' ? '#3b82f6' : prof.colorInfo.nombre }}
                            onClick={() => setIsOpen(true)}
                            title={prof.nombre}
                        >
                            {prof.nombre.charAt(0)}
                            {/* Tooltip al hacer hover */}
                            <span className="absolute left-10 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                {prof.nombre}
                            </span>
                        </div>
                    ))}
                    
                    {selectedProfs.length === 0 && (
                        <FaUserMd className="text-gray-300 text-2xl" title="Sin selección"/>
                    )}

                    {/* Botón flotante vertical para abrir modal si hay selección */}
                    {selectedProfs.length > 0 && (
                        <button 
                            onClick={onOpenModal}
                            className="mt-auto bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
                            title="Ver Agenda Combinada"
                        >
                            <FaExternalLinkAlt size={14}/>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ListaProfesionales;