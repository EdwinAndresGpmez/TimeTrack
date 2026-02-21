import React, { useState, useEffect, useRef } from 'react';
import { FaUserCircle, FaSearch, FaTimes, FaSave, FaPlus, FaLink, FaUnlink, FaIdCard, FaEnvelope } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { authService } from '../../services/authService';

const MapaFamiliar = ({ targetUser, onClose }) => {
    const [dependientes, setDependientes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estado para el manejo del arrastre
    const [draggingNode, setDraggingNode] = useState(null);
    const containerRef = useRef(null);

    // --- MATEMÁTICA PARA POSICIÓN INICIAL ---
    const radius = 35; 
    const getInitialOrbitalPosition = (index, total) => {
        const angle = (index / total) * 2 * Math.PI - (Math.PI / 2); 
        return {
            x: 50 + radius * Math.cos(angle),
            y: 50 + radius * Math.sin(angle)
        };
    };

    useEffect(() => {
        const cargarRed = async () => {
            try {
                const data = await authService.getRedFamiliar(targetUser.id);
                // Al cargar, asignamos posiciones orbitales iniciales a cada nodo
                const nodosConPosicion = (data || []).map((dep, idx, arr) => {
                    const pos = getInitialOrbitalPosition(idx, arr.length);
                    return { ...dep, x: pos.x, y: pos.y };
                });
                setDependientes(nodosConPosicion);
            } catch (error) {
                console.error("Error cargando red:", error);
                Swal.fire('Error', 'No se pudo cargar la red familiar', 'error');
            } finally {
                setLoading(false);
            }
        };
        cargarRed();
    }, [targetUser.id]);

    // Búsqueda con filtro local garantizado
    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (searchQuery.length >= 3) {
                try {
                    const results = await authService.getAllUsers(searchQuery);
                    const queryLower = searchQuery.toLowerCase();
                    const filtrados = results.filter(u => {
                        if (u.id === targetUser.id) return false;
                        if (dependientes.some(d => d.id === u.id)) return false;
                        const nombreMatch = u.nombre && u.nombre.toLowerCase().includes(queryLower);
                        const docMatch = u.documento && u.documento.toLowerCase().includes(queryLower);
                        return nombreMatch || docMatch;
                    });
                    setSearchResults(filtrados);
                } catch (error) { console.error(error); }
            } else {
                setSearchResults([]);
            }
        }, 400);
        return () => clearTimeout(delaySearch);
    }, [searchQuery, dependientes, targetUser.id]);

    // --- LÓGICA DE ARRASTRE (DRAG) ---
    const handleMouseDown = (id) => setDraggingNode(id);

    const handleMouseMove = (e) => {
        if (!draggingNode || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        // Calculamos la posición relativa en porcentaje dentro del contenedor
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setDependientes(prev => prev.map(node => 
            node.id === draggingNode ? { ...node, x, y } : node
        ));
    };

    const handleMouseUp = () => setDraggingNode(null);

    const addNode = async (user) => {
        if (user.dependientes && user.dependientes.length > 0) {
            Swal.fire('No permitido', `${user.nombre} ya tiene personas a su cargo.`, 'warning');
            return;
        }
        // Agregamos el nuevo nodo en una posición libre cerca del centro
        const newPos = getInitialOrbitalPosition(dependientes.length, dependientes.length + 1);
        setDependientes(prev => [...prev, {
            id: user.id,
            nombre: user.nombre,
            documento: user.documento,
            correo: user.email || user.correo || 'Sin correo',
            tipo_documento: user.tipo_documento || 'CC',
            x: newPos.x,
            y: newPos.y
        }]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const ids = dependientes.map(d => d.id);
            await authService.updateRedFamiliar(targetUser.id, ids);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Conexiones Guardadas Exitosamente', showConfirmButton: false, timer: 2000 });
            onClose(); 
        } catch (error) {
            Swal.fire('Error', 'Error al guardar conexiones', 'error');
        } finally { setSaving(false); }
    };

    return (
        <div 
            className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* HERRAMIENTAS SUPERIORES */}
            <div className="absolute top-6 left-6 right-6 z-[100] flex justify-between items-start pointer-events-none">
                <div className="w-96 pointer-events-auto relative">
                    <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 flex items-center p-3 focus-within:ring-4 focus-within:ring-purple-500/20 transition-all">
                        <FaSearch className="text-purple-400 ml-2 mr-3 text-lg" />
                        <input 
                            type="text" 
                            placeholder="Buscar familiar por nombre o documento..." 
                            className="w-full bg-transparent outline-none text-sm font-semibold text-slate-700"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && <FaTimes className="text-slate-300 hover:text-red-500 cursor-pointer mr-2 pointer-events-auto" onClick={() => setSearchQuery('')}/>}
                    </div>
                    {searchResults.length > 0 && (
                        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-64 overflow-y-auto ring-1 ring-black/5 pointer-events-auto">
                            {searchResults.map(u => (
                                <div key={u.id} className="p-4 hover:bg-purple-50 cursor-pointer border-b border-slate-50 flex justify-between items-center group transition-colors" onClick={() => addNode(u)}>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{u.nombre}</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">{u.tipo_documento} {u.documento}</p>
                                    </div>
                                    <FaLink className="text-purple-400 opacity-0 group-hover:opacity-100" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving || loading}
                    className="pointer-events-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-purple-100 flex items-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95"
                >
                    {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <FaSave size={18}/>}
                    Guardar Conexiones
                </button>
            </div>

            {/* LIENZO PRINCIPAL */}
            <div className="flex-1 relative" ref={containerRef}>
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[200]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="w-full h-full relative">
                        {/* CAPA DE LÍNEAS (SVG) */}
                        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
                            <defs>
                                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                            </defs>
                            {dependientes.map((dep) => (
                                <g key={`line-group-${dep.id}`}>
                                    <line 
                                        x1="50%" y1="50%" x2={`${dep.x}%`} y2={`${dep.y}%`} 
                                        stroke="url(#lineGrad)" strokeWidth="4" strokeDasharray="10,6"
                                    >
                                        <animate attributeName="stroke-dashoffset" from="100" to="0" dur="4s" repeatCount="indefinite" />
                                    </line>
                                    <circle cx={`${dep.x}%`} cy={`${dep.y}%`} r="5" fill="#6366f1" />
                                </g>
                            ))}
                        </svg>

                        {/* CAPA DE NODOS (HTML) */}
                        <div className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
                            {/* TITULAR PRINCIPAL (CENTRO) - FIJO */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(168,85,247,0.15)] border-4 border-purple-500 w-52 h-52 flex flex-col items-center justify-center text-center transition-transform hover:scale-105">
                                    <div className="bg-purple-100 text-purple-600 p-4 rounded-full mb-3 shadow-inner">
                                        <FaUserCircle size={45} />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-800 leading-tight uppercase px-2 line-clamp-2">{targetUser.nombre}</h3>
                                    <span className="mt-3 bg-purple-600 text-[10px] text-white font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-md">
                                        Titular Principal
                                    </span>
                                </div>
                            </div>

                            {/* DELEGADOS (MOVIBLES) */}
                            {dependientes.map((dep) => (
                                <div 
                                    key={`node-${dep.id}`} 
                                    className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-move ${draggingNode === dep.id ? 'z-50' : 'z-20'}`} 
                                    style={{ top: `${dep.y}%`, left: `${dep.x}%` }}
                                    onMouseDown={() => handleMouseDown(dep.id)}
                                >
                                    <div className={`bg-white p-4 rounded-3xl shadow-xl border-2 transition-all ${draggingNode === dep.id ? 'border-purple-500 scale-110 shadow-2xl' : 'border-indigo-100 hover:border-indigo-400'} w-48 flex flex-col items-center hover:-translate-y-2`}>
                                        <button 
                                            onMouseDown={(e) => e.stopPropagation()} 
                                            onClick={() => setDependientes(prev => prev.filter(d => d.id !== dep.id))} 
                                            className="absolute -top-3 -right-3 bg-red-500 text-white p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110 pointer-events-auto"
                                        >
                                            <FaUnlink size={14}/>
                                        </button>
                                        
                                        <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-3 font-black text-xl shadow-inner uppercase pointer-events-none rotate-3 group-hover:rotate-0 transition-transform">
                                            {dep.nombre.charAt(0)}
                                        </div>
                                        
                                        <h4 className="text-xs font-black text-slate-700 text-center mb-2 truncate w-full px-1 pointer-events-none">{dep.nombre}</h4>
                                        
                                        {/* INFORMACIÓN ADICIONAL RESTAURADA */}
                                        <div className="w-full space-y-1.5 pointer-events-none">
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-2">
                                                <FaIdCard className="text-indigo-400 text-xs shrink-0"/>
                                                <span className="text-[9px] font-mono font-bold text-slate-500">{dep.documento}</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-2 overflow-hidden">
                                                <FaEnvelope className="text-indigo-400 text-xs shrink-0"/>
                                                <span className="text-[9px] font-bold text-slate-500 truncate">{dep.correo}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-3 text-[9px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter border border-white shadow-sm pointer-events-none">
                                            Delegado
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* MENSAJE DE BIENVENIDA ANIMADO RESTAURADO */}
                            {dependientes.length === 0 && !loading && (
                                <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md px-8 py-4 rounded-2xl shadow-xl border border-purple-100 text-slate-600 text-sm font-bold flex items-center gap-3 animate-bounce z-10">
                                    <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                                        <FaPlus size={16}/>
                                    </div> 
                                    Usa la barra superior para agregar familiares a esta red.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapaFamiliar;