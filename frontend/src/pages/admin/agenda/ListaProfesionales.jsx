import React from 'react';
import { FaMapMarkerAlt, FaCalendarAlt, FaSearch } from 'react-icons/fa';

const ListaProfesionales = ({ sedes, profesionales, sedeSeleccionada, setSedeSeleccionada, profesionalSeleccionado, setProfesionalSeleccionado }) => {
    
    // Filtrar médicos (podrías agregar lógica para filtrar por sede si tu backend lo soporta, aquí filtramos visualmente)
    // Asumimos que el backend trae todo, si son muchos, mejor filtrar en backend.
    
    return (
        <div className="w-full md:w-80 bg-white shadow-xl z-10 flex flex-col border-r border-gray-200 h-full">
            <div className="p-4 bg-blue-900 text-white">
                <h2 className="font-bold flex items-center gap-2"><FaCalendarAlt/> Agenda Médica</h2>
                <p className="text-xs text-blue-200 mt-1">Configuración de Horarios</p>
            </div>
            
            {/* Selector Sede */}
            <div className="p-4 border-b bg-gray-50">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sede de Trabajo</label>
                <div className="relative">
                    <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400"/>
                    <select 
                        className="w-full pl-9 p-2 border rounded bg-white text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={sedeSeleccionada || ''}
                        onChange={(e) => setSedeSeleccionada(e.target.value)}
                    >
                        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                </div>
            </div>

            {/* Buscador Rápido */}
            <div className="px-4 pt-4 pb-2">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-3 text-gray-300 text-xs"/>
                    <input type="text" placeholder="Buscar médico..." className="w-full pl-8 p-2 text-xs border rounded bg-gray-50 focus:bg-white transition outline-none"/>
                </div>
            </div>

            {/* Lista Scrollable */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {profesionales.map(prof => (
                    <div 
                        key={prof.id}
                        onClick={() => setProfesionalSeleccionado(prof)}
                        className={`
                            p-3 rounded-lg cursor-pointer border transition flex items-center gap-3 group
                            ${profesionalSeleccionado?.id === prof.id 
                                ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500' 
                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-blue-300'}
                        `}
                    >
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm
                            ${profesionalSeleccionado?.id === prof.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'}
                        `}>
                            {prof.nombre.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <h4 className={`text-sm font-bold truncate ${profesionalSeleccionado?.id === prof.id ? 'text-blue-900' : 'text-gray-700'}`}>
                                {prof.nombre}
                            </h4>
                            <p className="text-xs text-gray-500 truncate">{prof.especialidades_nombres?.[0] || 'Profesional Salud'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ListaProfesionales;