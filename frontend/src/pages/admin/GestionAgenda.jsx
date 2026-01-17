import React, { useState, useEffect } from 'react';
import { agendaService } from '../../services/agendaService';
import { staffService } from '../../services/staffService';
import Swal from 'sweetalert2';
import { FaCalendarAlt, FaTrash, FaBan, FaClock, FaInfoCircle } from 'react-icons/fa';

const GestionAgenda = () => {
    const [activeTab, setActiveTab] = useState('horarios'); // 'horarios' | 'bloqueos'
    
    // Datos maestros
    const [profesionales, setProfesionales] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [servicios, setServicios] = useState([]); // <--- NUEVO: Para segmentar agenda
    
    // Datos de la agenda
    const [horarios, setHorarios] = useState([]);
    const [bloqueos, setBloqueos] = useState([]);
    const [loading, setLoading] = useState(false);

    // Formularios
    const [formHorario, setFormHorario] = useState({ 
        profesional_id: '', 
        lugar_id: '', 
        servicio_id: '', // <--- NUEVO: Si es vacío, es agenda mixta
        dia_semana: 0, 
        hora_inicio: '', 
        hora_fin: '' 
    });
    
    const [formBloqueo, setFormBloqueo] = useState({ 
        profesional_id: '', 
        fecha_inicio: '', 
        fecha_fin: '', 
        motivo: '' 
    });

    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    useEffect(() => {
        cargarMaestros();
        cargarAgenda();
    }, []);

    const cargarMaestros = async () => {
        try {
            const [prof, lug, serv] = await Promise.all([
                staffService.getProfesionales(),
                staffService.getLugares(),
                staffService.getServicios() // Traemos los servicios para el select
            ]);
            setProfesionales(prof);
            setLugares(lug);
            setServicios(serv);
        } catch (error) {
            console.error("Error cargando maestros", error);
        }
    };

    const cargarAgenda = async () => {
        setLoading(true);
        try {
            const [h, b] = await Promise.all([
                agendaService.getDisponibilidades(),
                agendaService.getBloqueos()
            ]);
            setHorarios(h);
            setBloqueos(b);
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    // --- MANEJO DE HORARIOS ---
    const handleCreateHorario = async (e) => {
        e.preventDefault();
        try {
            // Enviamos servicio_id como null si el string es vacío (para agenda general)
            const payload = {
                ...formHorario,
                servicio_id: formHorario.servicio_id === '' ? null : formHorario.servicio_id
            };
            
            await agendaService.createDisponibilidad(payload);
            Swal.fire('Éxito', 'Horario asignado correctamente', 'success');
            cargarAgenda();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.detail || 'Error al guardar (Verifique solapamientos)', 'error');
        }
    };

    const handleDeleteHorario = async (id) => {
        if (await confirmDelete()) {
            await agendaService.deleteDisponibilidad(id);
            cargarAgenda();
        }
    };

    // --- MANEJO DE BLOQUEOS ---
    const handleCreateBloqueo = async (e) => {
        e.preventDefault();
        try {
            await agendaService.createBloqueo(formBloqueo);
            Swal.fire('Bloqueado', 'El periodo ha sido bloqueado.', 'success');
            cargarAgenda();
        } catch (error) { Swal.fire('Error', 'No se pudo crear el bloqueo', 'error'); }
    };

    const handleDeleteBloqueo = async (id) => {
        if (await confirmDelete()) {
            await agendaService.deleteBloqueo(id);
            cargarAgenda();
        }
    };

    const confirmDelete = async () => {
        const res = await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true });
        return res.isConfirmed;
    };

    // Helpers de renderizado
    const getProfName = (id) => profesionales.find(p => p.id === parseInt(id))?.nombre || `ID: ${id}`;
    const getLugarName = (id) => lugares.find(l => l.id === parseInt(id))?.nombre || `ID: ${id}`;
    const getServiceName = (id) => servicios.find(s => s.id === parseInt(id))?.nombre || 'General / Mixto';

    return (
        <div className="max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaCalendarAlt className="text-blue-600"/> Gestión de Agenda Médica
            </h1>

            {/* TABS */}
            <div className="flex border-b border-gray-200 mb-6">
                <button onClick={() => setActiveTab('horarios')} className={`px-6 py-3 font-bold ${activeTab === 'horarios' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
                    <FaClock className="inline mr-2"/> Horarios Recurrentes
                </button>
                <button onClick={() => setActiveTab('bloqueos')} className={`px-6 py-3 font-bold ${activeTab === 'bloqueos' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}>
                    <FaBan className="inline mr-2"/> Bloqueos y Ausencias
                </button>
            </div>

            {/* TAB: HORARIOS */}
            {activeTab === 'horarios' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Formulario */}
                    <div className="bg-white p-6 rounded shadow h-fit">
                        <h3 className="font-bold text-lg mb-4 text-blue-800 border-b pb-2">Nuevo Turno Semanal</h3>
                        <form onSubmit={handleCreateHorario} className="space-y-4">
                            
                            {/* Médico */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Profesional</label>
                                <select className="w-full border p-2 rounded" required onChange={e => setFormHorario({...formHorario, profesional_id: e.target.value})}>
                                    <option value="">Seleccione...</option>
                                    {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>

                            {/* Sede */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Sede de Atención</label>
                                <select className="w-full border p-2 rounded" required onChange={e => setFormHorario({...formHorario, lugar_id: e.target.value})}>
                                    <option value="">Seleccione...</option>
                                    {lugares.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                                </select>
                            </div>

                            {/* Día */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Día de la Semana</label>
                                <select className="w-full border p-2 rounded" required onChange={e => setFormHorario({...formHorario, dia_semana: e.target.value})}>
                                    {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                </select>
                            </div>

                            {/* Tipo de Agenda (SEGMENTACIÓN) */}
                            <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
                                    <FaInfoCircle/> Enfoque (Opcional)
                                </label>
                                <select 
                                    className="w-full border p-2 rounded text-sm bg-white" 
                                    onChange={e => setFormHorario({...formHorario, servicio_id: e.target.value})}
                                >
                                    <option value="">Todo Tipo (Mixto)</option>
                                    {servicios.map(s => (
                                        <option key={s.id} value={s.id}>Solo {s.nombre}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                                    Si seleccionas uno, este horario solo servirá para ese servicio (Ej: Solo Particulares).
                                </p>
                            </div>

                            {/* Hora */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Horario</label>
                                <div className="flex gap-2 items-center">
                                    <input type="time" className="w-full border p-2 rounded" required onChange={e => setFormHorario({...formHorario, hora_inicio: e.target.value})} />
                                    <span className="text-gray-400 font-bold">-</span>
                                    <input type="time" className="w-full border p-2 rounded" required onChange={e => setFormHorario({...formHorario, hora_fin: e.target.value})} />
                                </div>
                            </div>

                            <button className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 shadow-lg transition transform active:scale-95">
                                + Agregar Horario
                            </button>
                        </form>
                    </div>

                    {/* Lista */}
                    <div className="md:col-span-2 bg-white rounded shadow overflow-hidden border border-gray-200">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold border-b">
                                <tr>
                                    <th className="p-4">Médico</th>
                                    <th className="p-4">Día / Hora</th>
                                    <th className="p-4">Enfoque</th>
                                    <th className="p-4">Sede</th>
                                    <th className="p-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? <tr><td colSpan="5" className="p-4 text-center">Cargando...</td></tr> : 
                                 horarios.map(h => (
                                    <tr key={h.id} className="hover:bg-blue-50 transition">
                                        <td className="p-4 font-bold text-gray-800">{getProfName(h.profesional_id)}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">
                                                    {DIAS[h.dia_semana]}
                                                </span>
                                                <span className="text-sm">{h.hora_inicio.slice(0,5)} - {h.hora_fin.slice(0,5)}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs">
                                            {h.servicio_id 
                                                ? <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-semibold border border-purple-200">{getServiceName(h.servicio_id)}</span> 
                                                : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">General</span>
                                            }
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{getLugarName(h.lugar_id)}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDeleteHorario(h.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded transition">
                                                <FaTrash/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && horarios.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400 italic">No hay horarios configurados.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: BLOQUEOS */}
            {activeTab === 'bloqueos' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded shadow h-fit border-t-4 border-red-500">
                        <h3 className="font-bold text-lg mb-4 text-red-700">Registrar Ausencia</h3>
                        <form onSubmit={handleCreateBloqueo} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Profesional</label>
                                <select className="w-full border p-2 rounded" required onChange={e => setFormBloqueo({...formBloqueo, profesional_id: e.target.value})}>
                                    <option value="">Seleccione...</option>
                                    {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Desde</label>
                                    <input type="date" className="w-full border p-2 rounded" required onChange={e => setFormBloqueo({...formBloqueo, fecha_inicio: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Hasta</label>
                                    <input type="date" className="w-full border p-2 rounded" required onChange={e => setFormBloqueo({...formBloqueo, fecha_fin: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Motivo</label>
                                <input type="text" placeholder="Ej: Vacaciones, Festivo..." className="w-full border p-2 rounded" required onChange={e => setFormBloqueo({...formBloqueo, motivo: e.target.value})} />
                            </div>
                            <button className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 shadow-lg">
                                Bloquear Agenda
                            </button>
                        </form>
                    </div>

                    <div className="md:col-span-2 bg-white rounded shadow overflow-hidden border border-gray-200">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b">
                                <tr>
                                    <th className="p-4">Médico</th>
                                    <th className="p-4">Vigencia</th>
                                    <th className="p-4">Motivo</th>
                                    <th className="p-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bloqueos.map(b => (
                                    <tr key={b.id} className="hover:bg-red-50 transition">
                                        <td className="p-4 font-bold text-gray-800">{getProfName(b.profesional_id)}</td>
                                        <td className="p-4 text-sm">
                                            Del <b>{new Date(b.fecha_inicio).toLocaleDateString()}</b> al <b>{new Date(b.fecha_fin).toLocaleDateString()}</b>
                                        </td>
                                        <td className="p-4 text-red-600 italic">{b.motivo}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDeleteBloqueo(b.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded transition">
                                                <FaTrash/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {bloqueos.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">No hay bloqueos activos.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionAgenda;