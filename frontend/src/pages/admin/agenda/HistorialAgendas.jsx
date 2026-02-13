import React, { useState, useEffect } from 'react';
import { citasService } from '../../../services/citasService';
import { 
    FaFileDownload, FaSearch, FaCalendarAlt, FaFilter, 
    FaInfoCircle, FaUserMd, FaHistory, FaNotesMedical 
} from 'react-icons/fa';
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

    // --- LÓGICA DE BÚSQUEDA ---
    const handleBuscar = async (e) => {
        if (e) e.preventDefault();
        
        if (!profesionalSeleccionado) return;

        setLoading(true);
        try {
            const profId = profesionalSeleccionado.id;

            const data = await citasService.getAll({
                fecha_inicio: filtros.fechaInicio,
                fecha_fin: filtros.fechaFin,
                profesional_id: profId,
                estado: filtros.estado
            });
            
            // Filtro de seguridad en cliente para asegurar consistencia
            const dataFiltrada = data.filter(c => 
                c.profesional_id === parseInt(profId) &&
                (!filtros.estado || c.estado === filtros.estado)
            );

            setCitas(dataFiltrada);
            
            if (dataFiltrada.length === 0 && e) {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
                Toast.fire({ icon: 'info', title: 'No se encontraron citas en este periodo' });
            }
        } catch (error) {
            console.error("Error cargando historial", error);
            Swal.fire('Error', 'No se pudo cargar el historial', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Cargar datos cuando cambia el profesional
    useEffect(() => {
        if (profesionalSeleccionado) {
            handleBuscar();
        } else {
            setCitas([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profesionalSeleccionado]); 

    const handleChange = (e) => {
        setFiltros({ ...filtros, [e.target.name]: e.target.value });
    };

    // --- EXPORTAR A CSV (Excel) ---
    const handleDescargar = () => {
        if (citas.length === 0) return Swal.fire('Info', 'No hay datos para exportar', 'info');

        const cabeceras = ['ID', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Paciente', 'Documento', 'Servicio', 'Estado', 'Nota Paciente', 'Nota Interna'];
        const filas = citas.map(c => [
            c.id,
            c.fecha,
            c.hora_inicio,
            c.hora_fin,
            `"${c.paciente_nombre || 'N/A'}"`,
            c.paciente_doc,
            `"${c.servicio_nombre || ''}"`,
            c.estado,
            `"${c.nota || ''}"`,
            `"${c.nota_interna || ''}"`
        ]);

        const csvContent = [cabeceras.join(','), ...filas.map(f => f.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Historial_${profesionalSeleccionado.nombre.replace(/\s+/g, '_')}_${filtros.fechaInicio}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- HELPER DE COLORES (Compatible con estados dinámicos) ---
    const getStatusBadge = (estado) => {
        // Mapeo base para estados conocidos
        const estilos = {
            'PENDIENTE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'ACEPTADA': 'bg-green-100 text-green-800 border-green-200',
            'REALIZADA': 'bg-blue-100 text-blue-800 border-blue-200',
            'CANCELADA': 'bg-red-100 text-red-800 border-red-200',
            'RECHAZADA': 'bg-orange-100 text-orange-800 border-orange-200',
            'NO_ASISTIO': 'bg-gray-100 text-gray-800 border-gray-200',
            'EN_SALA': 'bg-indigo-100 text-indigo-800 border-indigo-200'
        };
        // Fallback para estados personalizados nuevos: gris azulado
        const clase = estilos[estado] || 'bg-slate-100 text-slate-700 border-slate-200';
        
        return (
            <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border tracking-wider ${clase}`}>
                {estado.replace(/_/g, ' ')}
            </span>
        );
    };

    // --- RENDER SI NO HAY SELECCIÓN ---
    if (!profesionalSeleccionado) return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 h-full p-8 text-center animate-fade-in">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4 border border-gray-100">
                <FaUserMd size={40} className="text-blue-200"/>
            </div>
            <h3 className="text-lg font-bold text-gray-600">Historial de Atención</h3>
            <p className="text-sm max-w-xs mx-auto">Selecciona un profesional del menú izquierdo para auditar sus citas pasadas y generar reportes.</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
            {/* Header y Filtros */}
            <div className="bg-white border-b px-6 py-5 shadow-sm shrink-0 z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 tracking-tight">
                            <FaHistory className="text-indigo-600"/> Historial Clínico & Administrativo
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Auditoría de:</span>
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-sm font-bold border border-blue-100">
                                {profesionalSeleccionado.nombre}
                            </span>
                        </div>
                    </div>
                    {citas.length > 0 && (
                        <button 
                            onClick={handleDescargar} 
                            className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 shadow-md hover:shadow-lg flex items-center gap-2 transition transform hover:-translate-y-0.5"
                        >
                            <FaFileDownload/> Descargar Reporte CSV
                        </button>
                    )}
                </div>

                <form onSubmit={handleBuscar} className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Desde</label>
                        <div className="relative">
                            <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 text-xs"/>
                            <input 
                                type="date" 
                                name="fechaInicio" 
                                value={filtros.fechaInicio} 
                                onChange={handleChange} 
                                className="w-full pl-9 p-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Hasta</label>
                        <div className="relative">
                            <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 text-xs"/>
                            <input 
                                type="date" 
                                name="fechaFin" 
                                value={filtros.fechaFin} 
                                onChange={handleChange} 
                                className="w-full pl-9 p-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Estado</label>
                        <div className="relative">
                            <FaFilter className="absolute left-3 top-3 text-gray-400 text-xs"/>
                            <select 
                                name="estado" 
                                value={filtros.estado} 
                                onChange={handleChange} 
                                className="w-full pl-9 p-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none cursor-pointer"
                            >
                                <option value="">Todos los estados</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="ACEPTADA">Aceptada</option>
                                <option value="EN_SALA">En Sala</option>
                                <option value="REALIZADA">Realizada</option>
                                <option value="CANCELADA">Cancelada</option>
                                <option value="NO_ASISTIO">No Asistió</option>
                            </select>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <button 
                            type="submit" 
                            className="w-full bg-indigo-600 text-white p-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2 transition"
                        >
                            <FaSearch/> Filtrar
                        </button>
                    </div>
                </form>
            </div>

            {/* Tabla de Resultados */}
            <div className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mb-4"></div>
                        <p className="font-medium animate-pulse">Consultando base de datos...</p>
                    </div>
                ) : citas.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white p-8">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <FaInfoCircle size={32} className="text-gray-300"/>
                        </div>
                        <h4 className="text-lg font-bold text-gray-600">Sin registros encontrados</h4>
                        <p className="text-sm mt-1 max-w-md text-center">No hay citas que coincidan con los filtros aplicados para este profesional.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold border-b border-gray-200 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Fecha / Hora</th>
                                        <th className="px-6 py-4">Paciente</th>
                                        <th className="px-6 py-4">Servicio / Sede</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4">Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {citas.map(c => (
                                        <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                    <FaCalendarAlt className="text-gray-300 group-hover:text-indigo-500 transition-colors text-xs"/>
                                                    {c.fecha}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono mt-1 pl-5">
                                                    {c.hora_inicio?.slice(0,5)} - {c.hora_fin?.slice(0,5)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{c.paciente_nombre || 'Desconocido'}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 bg-gray-100 inline-block px-1.5 rounded font-mono">
                                                    {c.paciente_doc || '---'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-700">{c.servicio_nombre}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5 italic">{c.lugar_nombre}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(c.estado)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {c.nota || c.nota_interna ? (
                                                    <div className="flex flex-col gap-1 max-w-xs">
                                                        {c.nota && (
                                                            <p className="text-xs text-gray-600 flex items-start gap-1" title="Nota del Paciente">
                                                                <FaUserMd className="shrink-0 mt-0.5 text-blue-400"/> {c.nota}
                                                            </p>
                                                        )}
                                                        {c.nota_interna && (
                                                            <p className="text-xs text-gray-500 flex items-start gap-1 italic" title="Nota Interna">
                                                                <FaNotesMedical className="shrink-0 mt-0.5 text-orange-400"/> {c.nota_interna}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistorialPanel;