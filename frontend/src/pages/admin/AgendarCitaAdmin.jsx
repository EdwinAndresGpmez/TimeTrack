import React, { useState, useEffect } from 'react';
import { patientService } from '../../services/patientService';
import NuevaCita from '../system/NuevaCita'; 
import { FaSearch, FaArrowLeft, FaUserCircle, FaIdCard, FaSpinner } from 'react-icons/fa';

const AgendarCitaAdmin = () => {
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
    const [search, setSearch] = useState('');
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- LÓGICA DE BÚSQUEDA DINÁMICA (DEBOUNCE) ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search.trim().length >= 3) {
                ejecutarBusqueda(search);
            } else if (search.trim().length === 0) {
                setResultados([]);
            }
        }, 400); // Espera 400ms después de que el usuario deja de escribir

        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const ejecutarBusqueda = async (query) => {
        setLoading(true);
        try {
            const data = await patientService.getAll({ 
                search: query,
                admin_mode: true 
            });
            const lista = Array.isArray(data) ? data : (data.results || []);
            setResultados(lista);
        } catch (error) {
            console.error("Error buscando paciente:", error);
            setResultados([]);
        } finally {
            setLoading(false);
        }
    };

    // VISTA 2: Wizard de Agendamiento
    if (pacienteSeleccionado) {
        return (
            <div className="animate-fadeIn p-4 max-w-5xl mx-auto">
                <button 
                    onClick={() => {
                        setPacienteSeleccionado(null);
                        setSearch('');
                        setResultados([]);
                    }}
                    className="mb-6 flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors group"
                >
                    <FaArrowLeft className="group-hover:-translate-x-1 transition-transform"/> Volver al buscador
                </button>
                
                <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-1 rounded-2xl shadow-lg mb-8">
                    <div className="bg-white p-5 rounded-[calc(1rem-1px)] flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-2xl shadow-inner">
                                <FaUserCircle />
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs uppercase font-black tracking-widest">Paciente Seleccionado</p>
                                <h3 className="text-2xl font-black text-gray-800 leading-tight">
                                    {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
                                </h3>
                                <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm">
                                    <FaIdCard /> <span>{pacienteSeleccionado.numero_documento}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                             <span className="text-indigo-700 font-black text-xs uppercase">{pacienteSeleccionado.tipo_usuario_nombre || 'Paciente General'}</span>
                        </div>
                    </div>
                </div>
                
                <NuevaCita adminSelectedPatientId={pacienteSeleccionado.id} />
            </div>
        );
    }

    // VISTA 1: Buscador Dinámico
    return (
        <div className="max-w-4xl mx-auto p-6 min-h-[600px]">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-black text-gray-800 mb-3 tracking-tight">Agendamiento Administrativo</h1>
                <p className="text-gray-500 text-lg font-medium">Encuentra pacientes al instante y gestiona sus citas.</p>
            </div>

            {/* Barra de búsqueda Innovadora */}
            <div className="relative mb-12">
                <div className={`absolute inset-0 bg-indigo-500 blur-2xl opacity-10 transition-opacity ${loading ? 'opacity-30' : ''}`}></div>
                <div className="relative flex items-center bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-2 focus-within:border-indigo-500 transition-all">
                    <div className="pl-6 text-gray-400">
                        {loading ? <FaSpinner className="animate-spin text-indigo-500" size={24}/> : <FaSearch size={24}/>}
                    </div>
                    <input 
                        type="text"
                        className="w-full pl-4 pr-6 py-4 text-xl font-medium outline-none bg-transparent text-gray-700 placeholder:text-gray-300"
                        placeholder="Empieza a escribir nombre o documento..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                {search.length > 0 && search.length < 3 && (
                    <p className="absolute -bottom-7 left-6 text-indigo-400 text-xs font-bold animate-pulse">Escribe al menos 3 caracteres...</p>
                )}
            </div>

            {/* Grid de Resultados Dinámicos */}
            <div className="grid gap-6">
                {loading && resultados.length === 0 ? (
                    // Skeleton Loaders
                    [1,2,3].map(i => (
                        <div key={i} className="bg-gray-50 h-24 rounded-3xl animate-pulse border border-gray-100"></div>
                    ))
                ) : resultados.length > 0 ? (
                    resultados.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => setPacienteSeleccionado(p)}
                            className="bg-white p-6 rounded-3xl border border-gray-100 flex justify-between items-center hover:shadow-2xl hover:border-indigo-200 cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                    <FaUserCircle size={40} />
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-800 text-xl group-hover:text-indigo-600 transition-colors uppercase leading-tight">
                                        {p.nombre} {p.apellido}
                                    </h4>
                                    <p className="text-gray-400 font-bold flex items-center gap-2 mt-1">
                                        <FaIdCard size={14}/> {p.numero_documento}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {p.tipo_usuario_nombre && (
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black uppercase tracking-tighter">
                                        {p.tipo_usuario_nombre}
                                    </span>
                                )}
                                <span className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
                                    Agendar
                                </span>
                            </div>
                        </div>
                    ))
                ) : search.length >= 3 && !loading && (
                    <div className="text-center py-20 bg-gray-50 rounded-[40px] border-4 border-dashed border-gray-100">
                        <div className="mb-4 flex justify-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-200">
                                <FaSearch size={32}/>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-gray-400">No encontramos resultados para</h3>
                        <p className="text-indigo-500 font-black text-2xl mt-1">"{search}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgendarCitaAdmin;