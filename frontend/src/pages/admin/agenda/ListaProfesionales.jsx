import React, { useState } from 'react';
import {
    FaCalendarAlt,
    FaSearch,
    FaCheck,
    FaExternalLinkAlt,
    FaChevronLeft,
    FaChevronRight,
    FaUserMd,
    FaLightbulb,
    FaChevronDown
} from 'react-icons/fa';

const ALL_SEDES = 'ALL';

const ListaProfesionales = ({
    sedes,
    profesionales,
    sedeSeleccionada,
    setSedeSeleccionada,
    selectedProfs,
    toggleProfesional,
    onOpenModal
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSedesCollapsed, setIsSedesCollapsed] = useState(false);

    const isAllSedes = !sedeSeleccionada || String(sedeSeleccionada) === ALL_SEDES;
    const isSedeActiva = (id) => String(sedeSeleccionada) === String(id);

    const profesionalesFiltrados = profesionales.filter((p) => {
        const coincideTexto =
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.especialidades_nombres?.[0] || '').toLowerCase().includes(searchTerm.toLowerCase());

        const coincideSede =
            isAllSedes ||
            (p.lugares_atencion && p.lugares_atencion.includes(parseInt(sedeSeleccionada, 10)));

        return coincideTexto && coincideSede;
    });

    return (
        <div
            className={`
                h-full flex flex-col transition-all duration-300 ease-in-out bg-white border-r border-gray-200 shadow-xl z-20
                ${isOpen ? 'w-80' : 'w-16'}
            `}
        >
            <div
                className={`
                shrink-0 bg-gradient-to-r from-blue-900 to-blue-800 text-white flex items-center transition-all duration-300
                ${isOpen ? 'p-5 justify-between' : 'p-2 justify-center py-4'}
            `}
            >
                {isOpen && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <h2 className="font-bold flex items-center gap-2 text-lg tracking-tight">
                            <FaCalendarAlt className="text-blue-300" /> Staff
                        </h2>
                        <p className="text-[10px] text-blue-200 opacity-80">Gestion de Agenda</p>
                    </div>
                )}

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        text-white hover:bg-white/20 rounded-lg transition-colors p-2
                        ${!isOpen ? 'w-10 h-10 flex items-center justify-center' : ''}
                    `}
                    title={isOpen ? 'Contraer panel' : 'Expandir panel'}
                >
                    {isOpen ? <FaChevronLeft /> : <FaChevronRight size={20} />}
                </button>
            </div>

            {isOpen && (
                <>
                    <div className="p-4 border-b bg-gray-50 shrink-0 space-y-3 animate-fadeIn">
                        <div>
                            <button
                                type="button"
                                onClick={() => setIsSedesCollapsed((prev) => !prev)}
                                className="w-full flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2"
                            >
                                <span>Sede / Lugar</span>
                                <span className="flex items-center gap-1 normal-case text-[10px] text-gray-400 font-semibold">
                                    {isSedesCollapsed ? 'Expandir' : 'Minimizar'}
                                    <FaChevronDown className={`transition-transform ${isSedesCollapsed ? '-rotate-90' : ''}`} />
                                </span>
                            </button>
                            {!isSedesCollapsed && (
                                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-2 shadow-inner">
                                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                                <button
                                    type="button"
                                    onClick={() => setSedeSeleccionada(ALL_SEDES)}
                                    className={`group relative w-full p-3 rounded-2xl border text-left transition-all ${
                                        isAllSedes
                                            ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-400 ring-1 ring-blue-300 shadow-md'
                                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                    }`}
                                >
                                    <div className={`absolute -top-1.5 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isAllSedes ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700'}`}>
                                        Global
                                    </div>
                                    <p className={`text-xs font-bold ${isAllSedes ? 'text-blue-800' : 'text-gray-700'}`}>Todos</p>
                                    <p className="text-[10px] text-gray-500">Vista consolidada</p>
                                </button>

                                {sedes.map((s) => {
                                    const activa = isSedeActiva(s.id);
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setSedeSeleccionada(s.id)}
                                            className={`group relative w-full p-3 rounded-2xl border text-left transition-all ${
                                                activa
                                                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 ring-1 ring-emerald-300 shadow-md'
                                                    : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                                            }`}
                                            title={s.nombre}
                                        >
                                            <div className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ${activa ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]' : 'bg-slate-300 group-hover:bg-emerald-300'}`} />
                                            <p className={`text-xs font-bold truncate pr-4 ${activa ? 'text-emerald-800' : 'text-gray-700'}`}>
                                                {s.nombre}
                                            </p>
                                            <p className="text-[10px] text-gray-500 truncate">{s.direccion || 'Sede activa'}</p>
                                        </button>
                                    );
                                })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
                            <input
                                type="text"
                                placeholder="Buscar profesional..."
                                className="w-full pl-9 p-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 animate-fadeIn">
                        {profesionalesFiltrados.length === 0 ? (
                            <div className="text-center p-4 text-gray-400 text-sm italic">Sin resultados para el filtro actual.</div>
                        ) : (
                            profesionalesFiltrados.map((prof) => {
                                const selection = selectedProfs.find((p) => p.id === prof.id);
                                const isSelected = !!selection;

                                return (
                                    <div
                                        key={prof.id}
                                        onClick={() => toggleProfesional(prof)}
                                        className={`
                                            p-3 rounded-xl cursor-pointer border transition-all duration-200 flex items-center gap-3 relative group
                                            ${
                                                isSelected
                                                    ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-200'
                                                    : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'
                                            }
                                        `}
                                    >
                                        <div
                                            className={`
                                            w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner shrink-0 transition-all duration-300
                                            ${
                                                isSelected
                                                    ? 'text-white scale-110'
                                                    : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500'
                                            }
                                        `}
                                            style={
                                                isSelected
                                                    ? { backgroundColor: selection.colorInfo.nombre === 'blue' ? '#3b82f6' : selection.colorInfo.nombre }
                                                    : {}
                                            }
                                        >
                                            {isSelected ? <FaCheck size={12} /> : prof.nombre.charAt(0)}
                                        </div>

                                        <div className="overflow-hidden flex-1">
                                            <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{prof.nombre}</h4>
                                            <p className="text-[11px] text-gray-500 truncate font-medium">{prof.especialidades_nombres?.[0] || 'General'}</p>
                                        </div>

                                        {isSelected && (
                                            <div className={`w-2.5 h-2.5 rounded-full absolute top-3 right-3 border border-white shadow-sm ${selection.colorInfo.clase.split(' ')[0]}`} />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-4 border-t bg-gray-50 shrink-0 animate-fadeIn">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 text-[10px] text-yellow-800 shadow-sm leading-tight">
                            <div className="font-bold flex items-center gap-1 mb-1 text-yellow-900 text-xs">
                                <FaLightbulb className="text-yellow-600" /> Tips:
                            </div>
                            <p>• <b>Clic derecho</b> para editar.</p>
                            <p>• <b>Arrastra</b> para crear.</p>
                            <p>• Usa <b>Copiar/Pegar</b> en dias.</p>
                        </div>

                        <button
                            onClick={onOpenModal}
                            disabled={selectedProfs.length === 0}
                            className={`
                                w-full py-3 px-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all text-sm
                                ${
                                    selectedProfs.length > 0
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:-translate-y-0.5'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }
                            `}
                        >
                            <FaExternalLinkAlt size={12} />
                            {selectedProfs.length > 0 ? `Ver Agenda (${selectedProfs.length})` : 'Ver Agenda'}
                        </button>
                    </div>
                </>
            )}

            {!isOpen && (
                <div className="flex-1 flex flex-col items-center py-4 bg-gray-50 space-y-4 animate-fadeIn">
                    {selectedProfs.map((prof) => (
                        <div
                            key={prof.id}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md cursor-pointer hover:scale-110 transition-transform relative group"
                            style={{ backgroundColor: prof.colorInfo.nombre === 'blue' ? '#3b82f6' : prof.colorInfo.nombre }}
                            onClick={() => setIsOpen(true)}
                            title={prof.nombre}
                        >
                            {prof.nombre.charAt(0)}
                            <span className="absolute left-10 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                {prof.nombre}
                            </span>
                        </div>
                    ))}

                    {selectedProfs.length === 0 && <FaUserMd className="text-gray-300 text-2xl" title="Sin seleccion" />}

                    {selectedProfs.length > 0 && (
                        <button
                            onClick={onOpenModal}
                            className="mt-auto bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
                            title="Ver Agenda Combinada"
                        >
                            <FaExternalLinkAlt size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ListaProfesionales;
