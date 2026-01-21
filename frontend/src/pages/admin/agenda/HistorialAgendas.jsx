import React, { useState, useEffect } from 'react';
import { citasService } from '../../../services/citasService';
import { FaFileDownload, FaSearch, FaCalendarAlt, FaFilter, FaInfoCircle, FaUserMd } from 'react-icons/fa';
import Swal from 'sweetalert2';

const HistorialPanel = ({ profesionalSeleccionado }) => {
    // ESTADOS
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filtros Iniciales (Mes Actual)
    const [filtros, setFiltros] = useState({
        fechaInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        fechaFin: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        estado: ''
    });

    // Cargar datos cuando cambia el profesional o al montar
    useEffect(() => {
        if (profesionalSeleccionado) {
            handleBuscar();
        } else {
            setCitas([]);
        }
    }, [profesionalSeleccionado]);

    // --- LÓGICA DE BÚSQUEDA ---
    const handleBuscar = async (e) => {
        if (e) e.preventDefault();
        
        if (!profesionalSeleccionado) return;

        setLoading(true);
        try {
            // Nota: Asumimos que profesionalSeleccionado puede ser un objeto único (modo single) 
            // o podríamos adaptar para array si quisieras historial combinado. 
            // Por ahora, soporta el modo "un médico a la vez" que es lo estándar en historiales detallados.
            const profId = profesionalSeleccionado.id;

            const data = await citasService.getAll({
                fecha_inicio: filtros.fechaInicio,
                fecha_fin: filtros.fechaFin,
                profesional_id: profId,
                estado: filtros.estado
            });
            
            // Filtro de seguridad en cliente
            const dataFiltrada = data.filter(c => 
                c.profesional_id === parseInt(profId) &&
                (!filtros.estado || c.estado === filtros.estado)
            );

            setCitas(dataFiltrada);
            
            if (dataFiltrada.length === 0 && e) {
                Swal.fire({
                    toast: true, position: 'top-end', icon: 'info', 
                    title: 'No se encontraron citas en este periodo', 
                    showConfirmButton: false, timer: 3000 
                });
            }
        } catch (error) {
            console.error("Error cargando historial", error);
            Swal.fire('Error', 'No se pudo cargar el historial', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFiltros({ ...filtros, [e.target.name]: e.target.value });
    };

    // --- EXPORTAR A EXCEL (CSV) ---
    const handleDescargar = () => {
        if (citas.length === 0) return Swal.fire('Info', 'No hay datos para exportar', 'info');

        const cabeceras = ['ID', 'Fecha', 'Hora', 'Paciente', 'Documento', 'Servicio', 'Estado', 'Nota'];
        const filas = citas.map(c => [
            c.id,
            c.fecha,
            `${c.hora_inicio} - ${c.hora_fin}`,
            `"${c.paciente_nombre || 'N/A'}"`,
            c.paciente_doc,
            `"${c.servicio_nombre || ''}"`,
            c.estado,
            `"${c.nota || ''}"`
        ]);

        const csvContent = [cabeceras.join(','), ...filas.map(f => f.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Historial_${profesionalSeleccionado.nombre}_${filtros.fechaInicio}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- HELPER DE COLORES ---
    const getStatusBadge = (estado) => {
        const estilos = {
            'PENDIENTE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'ACEPTADA': 'bg-green-100 text-green-800 border-green-200',
            'REALIZADA': 'bg-blue-100 text-blue-800 border-blue-200',
            'CANCELADA': 'bg-red-100 text-red-800 border-red-200',
            'INASISTENCIA': 'bg-gray-100 text-gray-800 border-gray-200'
        };
        const clase = estilos[estado] || 'bg-gray-50 text-gray-600 border-gray-200';
        
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${clase}`}>
                {estado}
            </span>
        );
    };

    // --- RENDER SI NO HAY SELECCIÓN ---
    if (!profesionalSeleccionado) return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 h-full p-8 text-center">
            <div className="bg-white p-8 rounded-full shadow-sm mb-4">
                <FaUserMd size={40} className="text-blue-200"/>
            </div>
            <h3 className="text-lg font-bold text-gray-600">Historial de Citas</h3>
            <p className="text-sm">Selecciona un profesional del menú izquierdo para ver su registro histórico.</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header y Filtros */}
            <div className="bg-white border-b px-6 py-4 shadow-sm shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <FaHistory className="text-blue-600"/> Historial de Citas
                        </h2>
                        <p className="text-sm text-gray-500">
                            Profesional: <span className="font-bold text-blue-700">{profesionalSeleccionado.nombre}</span>
                        </p>
                    </div>
                    {citas.length > 0 && (
                        <button 
                            onClick={handleDescargar} 
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm flex items-center gap-2 transition"
                        >
                            <FaFileDownload/> Exportar Excel
                        </button>
                    )}
                </div>

                <form onSubmit={handleBuscar} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Fecha Inicio</label>
                        <div className="relative">
                            <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs"/>
                            <input 
                                type="date" 
                                name="fechaInicio" 
                                value={filtros.fechaInicio} 
                                onChange={handleChange} 
                                className="w-full pl-8 p-2 text-sm border rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Fecha Fin</label>
                        <div className="relative">
                            <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-xs"/>
                            <input 
                                type="date" 
                                name="fechaFin" 
                                value={filtros.fechaFin} 
                                onChange={handleChange} 
                                className="w-full pl-8 p-2 text-sm border rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Estado</label>
                        <div className="relative">
                            <FaFilter className="absolute left-3 top-2.5 text-gray-400 text-xs"/>
                            <select 
                                name="estado" 
                                value={filtros.estado} 
                                onChange={handleChange} 
                                className="w-full pl-8 p-2 text-sm border rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition appearance-none"
                            >
                                <option value="">Todos los estados</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="ACEPTADA">Aceptada</option>
                                <option value="REALIZADA">Realizada</option>
                                <option value="CANCELADA">Cancelada</option>
                                <option value="INASISTENCIA">Inasistencia</option>
                            </select>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 transition h-[38px]"
                    >
                        <FaSearch/> Buscar
                    </button>
                </form>
            </div>

            {/* Tabla de Resultados */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                        <p>Buscando registros...</p>
                    </div>
                ) : citas.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <FaInfoCircle size={32} className="mb-2 opacity-20"/>
                        <p>No se encontraron citas en este rango de fechas.</p>
                        <p className="text-xs mt-1">Intenta ampliar el filtro de búsqueda.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Fecha / Hora</th>
                                    <th className="px-6 py-4">Paciente</th>
                                    <th className="px-6 py-4">Servicio</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4">Notas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {citas.map(c => (
                                    <tr key={c.id} className="hover:bg-blue-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{c.fecha}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5 group-hover:text-blue-600">
                                                {c.hora_inicio?.slice(0,5)} - {c.hora_fin?.slice(0,5)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{c.paciente_nombre}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                                <span className="font-mono">{c.paciente_doc}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-700">{c.servicio_nombre}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(c.estado)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-gray-500 italic max-w-xs truncate" title={c.nota}>
                                                {c.nota || '-'}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistorialPanel;