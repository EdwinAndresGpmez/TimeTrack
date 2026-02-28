import React, { useEffect, useState } from 'react';
import { staffService } from '../../services/staffService';
import { authService } from '../../services/authService';
import Swal from 'sweetalert2';
import { 
    FaPlus, FaEdit, FaToggleOn, FaToggleOff, FaUserMd, 
    FaSearch, FaChevronLeft, FaChevronRight, FaLink, FaIdCard, FaEnvelope 
} from 'react-icons/fa';

const ITEMS_PER_PAGE = 10;

const AdminProfesionales = () => {
    const [profesionales, setProfesionales] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(true);

    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    // Búsqueda de usuarios para vinculación
    const [userQuery, setUserQuery] = useState('');
    const [userResults, setUserResults] = useState([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        nombre: '', numero_documento: '', registro_medico: '',
        email_profesional: '', telefono_profesional: '',
        especialidades: [], lugares_atencion: [], servicios_habilitados: [],
        activo: true, user_id: null
    });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [p, esp, lug, srv] = await Promise.all([
                staffService.getProfesionales(),
                staffService.getEspecialidades({ activo: true }),
                staffService.getLugares({ activo: true }),
                staffService.getServicios({ activo: true })
            ]);
            setProfesionales(Array.isArray(p) ? p : []);
            setEspecialidades(Array.isArray(esp) ? esp : []);
            setLugares(Array.isArray(lug) ? lug : []);
            setServicios(Array.isArray(srv) ? srv : []);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (val) => {
        setUserQuery(val);
        if (val.length < 3) {
            setUserResults([]);
            return;
        }
        try {
            const data = await authService.getAllUsers(val);
            setUserResults(data || []);
        } catch (error) { console.error(error); }
    };

    const handleSave = async () => {
        if (!form.nombre || !form.numero_documento) {
            return Swal.fire('Validación', 'Nombre y Documento son obligatorios', 'warning');
        }

        try {
            Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });
            let res;
            
            // 1. Guardar en Microservicio de Profesionales (Staff-MS)
            if (editing) {
                res = await staffService.updateProfesional(editing.id, form);
            } else {
                res = await staffService.createProfesional(form);
            }

            // 2. SINCRONIZACIÓN CRÍTICA CON AUTH-MS
            // Obtenemos el ID generado o el existente
            const professionalIdToSync = editing ? editing.id : res.id;

            if (form.user_id) {
                try {
                    // Enviamos el profesional_id al microservicio de Autenticación
                    await authService.updateUserAdmin(form.user_id, {
                        nombre: form.nombre,
                        documento: form.numero_documento,
                        profesional_id: professionalIdToSync // <-- Aquí se vincula realmente
                    });
                } catch (errAuth) {
                    console.warn("Sincronización parcial de usuario:", errAuth);
                    // No bloqueamos el flujo si falla Auth, pero avisamos en consola
                }
            }

            Swal.fire('Éxito', 'Profesional guardado y sincronizado.', 'success');
            setModalOpen(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error al procesar la solicitud.', 'error');
        }
    };

    const openEdit = (p) => {
        setEditing(p);
        setForm({
            ...p,
            especialidades: p.especialidades || [],
            lugares_atencion: p.lugares_atencion || [],
            servicios_habilitados: p.servicios_habilitados || [],
            user_id: p.user_id || null
        });
        setUserQuery(p.user_id ? `Usuario ID: ${p.user_id}` : '');
        setUserResults([]);
        setModalOpen(true);
    };

    const handleToggleActivo = async (p) => {
        try {
            await staffService.updateProfesional(p.id, { activo: !p.activo });
            cargarDatos();
        } catch { Swal.fire('Error', 'No se pudo cambiar el estado.', 'error'); }
    };

    const filtered = profesionales.filter(p => {
        const q = query.toLowerCase();
        return !q || p.nombre.toLowerCase().includes(q) || p.numero_documento.includes(q);
    });

    const pages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const visible = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="max-w-7xl mx-auto p-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <FaUserMd className="text-indigo-600" /> Cuerpo Médico
                    </h1>
                    <p className="text-gray-500 font-medium">Gestión de profesionales y servicios habilitados.</p>
                </div>
                <button onClick={() => { setEditing(null); setForm({ nombre: '', numero_documento: '', registro_medico: '', email_profesional: '', telefono_profesional: '', especialidades: [], lugares_atencion: [], servicios_habilitados: [], activo: true, user_id: null }); setModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
                    <FaPlus /> Nuevo Profesional
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                    <input type="text" placeholder="Buscar por nombre, documento o especialidad..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
                </div>
            </div>

            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal text-sm">
                        <thead className="bg-gray-800 text-white font-black text-[10px] uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4 text-left">Profesional</th>
                                <th className="px-6 py-4 text-left">Documento / RM</th>
                                <th className="px-6 py-4 text-left">Especialidades</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 animate-pulse font-bold">Sincronizando información...</td></tr>
                            ) : visible.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">No se encontraron profesionales registrados.</td></tr>
                            ) : visible.map(p => (
                                <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 uppercase text-xs">{p.nombre}</span>
                                            {p.user_id ? (
                                                <span className="text-[9px] text-teal-600 font-bold flex items-center gap-1 mt-1 bg-teal-50 w-max px-1.5 py-0.5 rounded shadow-sm">
                                                    <FaLink /> Usuario Vinculado (ID: {p.user_id})
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-orange-400 font-bold mt-1 italic">Sin cuenta de acceso</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-mono font-bold text-gray-600 uppercase">{p.numero_documento}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">{p.registro_medico || 'Sin registro'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {p.especialidades_nombres?.length > 0 ? p.especialidades_nombres.map((en, i) => (
                                                <span key={i} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-black border border-indigo-100 uppercase tracking-tighter">{en}</span>
                                            )) : <span className="text-[9px] text-gray-400 font-bold">General</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleToggleActivo(p)} className={`text-2xl transition-all active:scale-90 ${p.activo ? 'text-green-500' : 'text-red-300'}`}>
                                            {p.activo ? <FaToggleOn /> : <FaToggleOff />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-indigo-100">
                                            <FaEdit size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Página {page} de {pages}</span>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-colors"><FaChevronLeft size={12} /></button>
                        <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-colors"><FaChevronRight size={12} /></button>
                    </div>
                </div>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-md">
                    <div className="flex items-center justify-center min-h-screen px-4 py-8">
                        <div className="fixed inset-0 bg-gray-900/60 transition-opacity" onClick={() => setModalOpen(false)}></div>
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl transform transition-all w-full max-w-4xl z-10 border border-gray-100">
                            <div className="p-10">
                                <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-4 border-b pb-6 uppercase tracking-tighter">
                                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl rotate-3"><FaUserMd /></div>
                                    {editing ? 'Perfil Profesional' : 'Nuevo Médico'}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <FaIdCard /> Información del Profesional
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nombre Completo *</label>
                                                        <input name="nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all uppercase" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Documento *</label>
                                                        <input name="numero_documento" value={form.numero_documento} onChange={e => setForm({ ...form, numero_documento: e.target.value })} className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-mono focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Registro Médico</label>
                                                        <input name="registro_medico" value={form.registro_medico} onChange={e => setForm({ ...form, registro_medico: e.target.value })} className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <FaEnvelope /> Contacto Directo
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Correo Profesional</label>
                                                    <input name="email_profesional" value={form.email_profesional} onChange={e => setForm({ ...form, email_profesional: e.target.value })} className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Teléfono</label>
                                                    <input name="telefono_profesional" value={form.telefono_profesional} onChange={e => setForm({ ...form, telefono_profesional: e.target.value })} className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Habilitaciones Clínicas</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Especialidades</label>
                                                    <select multiple className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm min-h-[80px] outline-none"
                                                        value={form.especialidades} onChange={e => setForm({ ...form, especialidades: Array.from(e.target.selectedOptions, o => o.value) })}>
                                                        {especialidades.map(esp => <option key={esp.id} value={esp.id}>{esp.nombre}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Sedes de Atención</label>
                                                    <select multiple className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm min-h-[80px] outline-none"
                                                        value={form.lugares_atencion} onChange={e => setForm({ ...form, lugares_atencion: Array.from(e.target.selectedOptions, o => o.value) })}>
                                                        {lugares.map(lug => <option key={lug.id} value={lug.id}>{lug.nombre} - {lug.ciudad}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Servicios Autorizados</label>
                                                    <select multiple className="w-full bg-gray-50 border-gray-200 border-2 rounded-xl p-3 text-sm min-h-[80px] outline-none font-bold text-indigo-700"
                                                        value={form.servicios_habilitados} onChange={e => setForm({ ...form, servicios_habilitados: Array.from(e.target.selectedOptions, o => o.value) })}>
                                                        {servicios.map(srv => <option key={srv.id} value={srv.id}>{srv.nombre}</option>)}
                                                    </select>
                                                    <p className="text-[9px] text-gray-400 mt-1 italic">Presiona Ctrl para seleccionar varios servicios.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ÁREA DE VINCULACIÓN DE CUENTA */}
                                <div className="mt-10 pt-8 border-t-2 border-dashed border-gray-100">
                                    <h4 className="text-[11px] font-black text-teal-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <FaLink /> Vinculación de Acceso al Sistema
                                    </h4>
                                    <div className="relative">
                                        <input type="text" placeholder="Buscar usuario por nombre o documento..." className="w-full bg-teal-50/30 border-teal-100 border-2 rounded-2xl p-4 pl-12 text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                                            value={userQuery} onChange={e => searchUsers(e.target.value)} />
                                        <FaSearch className="absolute left-4 top-5 text-teal-300" />
                                        
                                        {userResults.length > 0 && (
                                            <div className="absolute z-50 w-full bg-white border border-gray-100 shadow-2xl rounded-2xl mt-2 max-h-60 overflow-y-auto ring-1 ring-black/5">
                                                {userResults.map(u => (
                                                    <div key={u.id} onClick={() => { setForm({ ...form, user_id: u.id }); setUserQuery(`${u.nombre} (${u.documento})`); setUserResults([]); }}
                                                        className="p-4 hover:bg-teal-50 cursor-pointer border-b border-gray-50 flex justify-between items-center transition-all">
                                                        <div>
                                                            <p className="text-sm font-black text-gray-800 uppercase">{u.nombre}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono">{u.documento}</p>
                                                        </div>
                                                        <span className="text-[9px] bg-gray-100 px-2 py-1 rounded-lg text-gray-400 font-black">ID {u.id}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {form.user_id && (
                                        <div className="mt-4 flex items-center justify-between bg-teal-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-teal-100 animate-fade-in">
                                            <div className="flex items-center gap-3">
                                                <FaLink className="animate-bounce" />
                                                <span className="text-xs font-black uppercase tracking-tighter">Cuenta vinculada correctamente</span>
                                            </div>
                                            <button type="button" onClick={() => { setForm({ ...form, user_id: null }); setUserQuery(''); }} className="text-[10px] font-black bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg uppercase transition-all">Desvincular</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 px-10 py-6 flex flex-row-reverse gap-4 border-t border-gray-100">
                                <button onClick={handleSave} className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all active:scale-95">
                                    {editing ? 'ACTUALIZAR PERFIL' : 'REGISTRAR MÉDICO'}
                                </button>
                                <button onClick={() => setModalOpen(false)} className="bg-white border-2 border-gray-200 text-gray-500 px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all">
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProfesionales;