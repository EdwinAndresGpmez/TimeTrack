import React, { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { authService } from '../../services/authService';
import { FaLink, FaSave, FaSearch, FaTimes } from 'react-icons/fa';
import AnimatedActionButton from '../../components/system/AnimatedActionButton';

const MapaFamiliar = ({ targetUser, onClose }) => {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [dependientes, setDependientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');

    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    const canvasRef = useRef(null);
    const draggingRef = useRef(null);
    const offsetRef = useRef({ x: 0, y: 0 });

    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return availableUsers
            .filter(u => {
                const name = (u.nombre || '').toLowerCase();
                const doc = String(u.documento || '').toLowerCase();
                return name.includes(q) || doc.includes(q);
            })
            .slice(0, 10);
    }, [searchQuery, availableUsers]);

    const cargarRed = async () => {
        try {
            setLoading(true);
            const [usersData, red] = await Promise.all([
                authService.getAllUsers(),
                authService.getRedFamiliar(targetUser.id),
            ]);

            setAvailableUsers(Array.isArray(usersData) ? usersData : (usersData?.results || []));

            const deps = Array.isArray(red) ? red : (red?.results || []);
            setDependientes(deps);

            const center = { x: 520, y: 280 };
            const parentNode = {
                id: String(targetUser.id),
                user: targetUser,
                x: center.x,
                y: center.y,
                type: 'target',
            };

            const childNodes = deps.map((d, idx) => ({
                id: String(d.id),
                user: d,
                x: center.x + 260 * Math.cos((2 * Math.PI * idx) / Math.max(1, deps.length)),
                y: center.y + 180 * Math.sin((2 * Math.PI * idx) / Math.max(1, deps.length)),
                type: 'child',
            }));

            const newNodes = [parentNode, ...childNodes];

            const newEdges = childNodes.map(n => ({
                from: parentNode.id,
                to: n.id,
            }));

            setNodes(newNodes);
            setEdges(newEdges);
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo cargar la red familiar.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!targetUser?.id) return;
        cargarRed();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUser?.id]);

    const addNode = (u) => {
        if (!u?.id) return;

        const exists = nodes.some(n => n.id === String(u.id));
        if (exists) {
            setSearchQuery('');
            return;
        }

        const center = { x: 520, y: 280 };
        const newNode = {
            id: String(u.id),
            user: u,
            x: center.x + (Math.random() * 280 - 140),
            y: center.y + (Math.random() * 220 - 110),
            type: 'child',
        };

        setNodes(prev => [...prev, newNode]);
        setEdges(prev => [...prev, { from: String(targetUser.id), to: String(u.id) }]);

        setDependientes(prev => [...prev, u]);
        setSearchQuery('');
    };

    const removeNode = (nodeId) => {
        const idStr = String(nodeId);
        if (idStr === String(targetUser.id)) return;

        setNodes(prev => prev.filter(n => n.id !== idStr));
        setEdges(prev => prev.filter(e => e.to !== idStr));
        setDependientes(prev => prev.filter(d => String(d.id) !== idStr));
    };

    const handleMouseDown = (e, nodeId) => {
        e.preventDefault();
        e.stopPropagation();

        draggingRef.current = nodeId;

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        const node = nodes.find(n => n.id === nodeId);
        const nodeX = node?.x ?? 0;
        const nodeY = node?.y ?? 0;

        offsetRef.current = {
            x: mouseX - nodeX,
            y: mouseY - nodeY,
        };
    };

    const handleMouseMove = (e) => {
        if (!draggingRef.current) return;
        const nodeId = draggingRef.current;

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        const x = e.clientX - canvasRect.left - offsetRef.current.x;
        const y = e.clientY - canvasRect.top - offsetRef.current.y;

        setNodes(prev =>
            prev.map(n => {
                if (n.id !== nodeId) return n;
                return {
                    ...n,
                    x,
                    y,
                };
            })
        );
    };

    const handleMouseUp = () => {
        draggingRef.current = null;
    };

    const handleSave = async () => {
        if (!targetUser?.id) return;

        try {
            setSaving(true);
            Swal.fire({
                title: 'Guardando...',
                text: 'Actualizando conexiones familiares',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            const ids = dependientes.map(d => d.id);
            await authService.updateRedFamiliar(targetUser.id, ids);

            Swal.fire('Listo', 'Conexiones guardadas correctamente.', 'success');
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo guardar la red familiar.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
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
                        {searchQuery && (
                            <FaTimes
                                className="text-slate-300 hover:text-red-500 cursor-pointer mr-2 pointer-events-auto"
                                onClick={() => setSearchQuery('')}
                            />
                        )}
                    </div>

                    {searchResults.length > 0 && (
                        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-64 overflow-y-auto ring-1 ring-black/5 pointer-events-auto">
                            {searchResults.map(u => (
                                <div
                                    key={u.id}
                                    className="p-4 hover:bg-purple-50 cursor-pointer border-b border-slate-50 flex justify-between items-center group transition-colors"
                                    onClick={() => addNode(u)}
                                >
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{u.nombre}</p>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase">
                                            {u.tipo_documento} {u.documento}
                                        </p>
                                    </div>
                                    <FaLink className="text-purple-400 opacity-0 group-hover:opacity-100" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <AnimatedActionButton
                    onClick={handleSave}
                    disabled={saving || loading}
                    icon={
                        saving
                            ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            : <FaSave size={18} />
                    }
                    label="Guardar Conexiones"
                    sublabel="Guardar"
                    className="!bg-purple-600 hover:!bg-purple-700 pointer-events-auto"
                />
            </div>
            <div className="flex-1 relative" ref={canvasRef}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-white" />

                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
                    {edges.map((e, idx) => {
                        const from = nodes.find(n => n.id === e.from);
                        const to = nodes.find(n => n.id === e.to);
                        if (!from || !to) return null;

                        const x1 = from.x + 40;
                        const y1 = from.y + 40;
                        const x2 = to.x + 40;
                        const y2 = to.y + 40;

                        return (
                            <line
                                key={idx}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="rgba(147,51,234,0.35)"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                        );
                    })}
                </svg>
                {nodes.map(n => (
                    <div
                        key={n.id}
                        onMouseDown={(e) => handleMouseDown(e, n.id)}
                        className={`absolute cursor-move select-none rounded-2xl shadow-xl border flex flex-col items-center justify-center px-4 py-3 transition-all ${
                            n.type === 'target'
                                ? 'bg-indigo-600 text-white border-indigo-300'
                                : 'bg-white text-slate-800 border-purple-100 hover:border-purple-300'
                        }`}
                        style={{
                            left: n.x,
                            top: n.y,
                            width: 160,
                            zIndex: 20,
                        }}
                    >
                        <div className="text-sm font-black text-center leading-tight">
                            {n.user?.nombre || 'Usuario'}
                        </div>
                        <div className={`text-[10px] mt-1 font-mono ${
                            n.type === 'target' ? 'text-indigo-100' : 'text-slate-400'
                        }`}>
                            {n.user?.tipo_documento} {n.user?.documento}
                        </div>

                        {n.type !== 'target' && (
                            <button
                                className="mt-2 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                onClick={(e) => { e.stopPropagation(); removeNode(n.id); }}
                                type="button"
                            >
                                Quitar
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500 font-semibold">
                    {loading ? 'Cargando red…' : `Conexiones actuales: ${dependientes.length}`}
                </div>
                <button
                    onClick={onClose}
                    className="text-xs font-black uppercase px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                    type="button"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default MapaFamiliar;
