import React, { useState, useEffect } from 'react';
import { citasService } from '../../../services/citasService';
import { FaFileDownload, FaSearch, FaCalendarAlt, FaFilter, FaInfoCircle } from 'react-icons/fa';
import Swal from 'sweetalert2';

const HistorialPanel = ({ profesionalSeleccionado }) => {
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filtros por defecto: Mes actual
    const [filtros, setFiltros] = useState({
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaFin: new Date().toISOString().split('T')[0],
        estado: ''
    });

    // Recargar cuando cambia el médico seleccionado en el padre
    useEffect(() => {
        if (profesionalSeleccionado) {
            handleBuscar();
        } else {
            setCitas([]);
        }
    }, [profesionalSeleccionado]);

    const handleBuscar = async (e) => {
        if(e) e.preventDefault();
        
        if (!profesionalSeleccionado) return;

        setLoading(true);
        try {
            // Nota: El servicio debe soportar estos query params
            const data = await citasService.getAll({
                fecha_inicio: filtros.fechaInicio,
                fecha_fin: filtros.fechaFin,
                profesional_id: profesionalSeleccionado.id, // Forzamos el médico actual
                estado: filtros.estado
            });
            
            // Filtro de seguridad en cliente (por si el backend devuelve todo)
            const dataFiltrada = data.filter(c => 
                c.profesional_id === parseInt(profesionalSeleccionado.id) &&
                (!filtros.estado || c.estado === filtros.estado)
            );

            setCitas(dataFiltrada);
            
            if (dataFiltrada.length === 0 && e) {
                Swal.fire({
                    toast: true, position: 'top-end', icon: 'info', 
                    title: 'No se encontraron citas en este rango', showConfirmButton: false, timer: 3000 
                });
            }
        } catch (error) {
            console.error("Error historial", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFiltros({ ...filtros, [e.target.name]: e.target.value });
    };

    const handleDescargar = () => {
        if (citas.length === 0) return Swal.fire('Info', 'No hay datos para exportar', 'info');

        const cabeceras = ['Fecha', 'Hora', 'Paciente', 'Documento', 'Servicio', 'Estado', 'Nota'];
        const filas = citas.map(c => [
            c.fecha,
            `${c.hora_inicio} - ${c.hora_fin}`,
            `"${c.paciente_nombre || ''}"`,
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

    const getStatusColor = (estado) => {
        const map = {
            'PENDIENTE': 'bg-yellow-100 text-yellow-800',
            'ACEPTADA': 'bg-green-100 text-green-800',
            'REALIZADA': 'bg-blue-100 text-blue-800',
            'CANCELADA': 'bg-red-100 text-red-800',
            'INASISTENCIA': 'bg-gray-100 text-gray-800'
        };
        return map[estado] || 'bg-gray-50';
    };

    if (!profesionalSeleccionado) return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white h-full">
            <FaInfoCircle size={40} className="mb-4 opacity-20"/>
            <p>Seleccione un profesional a la izquierda para ver su historial.</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header / Filtros */}
            <div className="p-4 border-b bg-gray-50">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                    Historial: <span className="text-blue-600">{profesionalSeleccionado.nombre}</span>
                </h3>
                <form onSubmit={handleBuscar} className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Desde</label>
                        <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleChange} className="border rounded p-1.5 text-sm bg-white outline-none focus:border-blue-500"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Hasta</label>
                        <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleChange} className="border rounded p-1.5 text-sm bg-white outline-none focus:border-blue-500"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Estado</label>
                        <select name="estado" value={filtros.estado} onChange={handleChange} className="border rounded p-1.5 text-sm bg-white w-32 outline-none focus:border-blue-500">
                            <option value="">Todos</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="ACEPTADA">Aceptada</option>
                            <option value="REALIZADA">Realizada</option>
                            <option value="CANCELADA">Cancelada</option>
                            <option value="INASISTENCIA">Inasistencia</option>
                        </select>
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2">
                        <FaSearch/> Filtrar
                    </button>
                    {citas.length > 0 && (
                        <button type="button" onClick={handleDescargar} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-green-700 shadow-sm flex items-center gap-2 ml-auto">
                            <FaFileDownload/> CSV
                        </button>
                    )}
                </form>
            </div>

            {/* Tabla */}
            <div className="flex-1 overflow-auto p-4 bg-white">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Cargando datos...</div>
                ) : citas.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 italic border-2 border-dashed border-gray-100 rounded-lg m-4">
                        No hay citas registradas en este periodo.
                    </div>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Hora</th>
                                    <th className="p-3">Paciente</th>
                                    <th className="p-3">Servicio</th>
                                    <th className="p-3 text-center">Estado</th>
                                    <th className="p-3">Notas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {citas.map(c => (
                                    <tr key={c.id} className="hover:bg-blue-50 transition">
                                        <td className="p-3 font-mono text-gray-700">{c.fecha}</td>
                                        <td className="p-3 font-mono text-gray-600">{c.hora_inicio?.slice(0,5)} - {c.hora_fin?.slice(0,5)}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-gray-800">{c.paciente_nombre}</div>
                                            <div className="text-xs text-gray-500">{c.paciente_doc}</div>
                                        </td>
                                        <td className="p-3 text-xs text-gray-600">{c.servicio_nombre}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(c.estado)}`}>
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-500 text-xs italic max-w-xs truncate">{c.nota || '-'}</td>
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