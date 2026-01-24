import React, { useEffect, useState, useContext } from 'react';
import { patientService } from '../../services/patientService';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { FaPlus, FaEdit, FaToggleOn, FaToggleOff, FaUserTie, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const ITEMS_PER_PAGE = 10;

const GestionPacientes = () => {
    const { roles, user } = useContext(AuthContext);
    const [pacientes, setPacientes] = useState([]);
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination / filter
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    // Modal / form
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        nombre: '', apellido: '', tipo_documento: 'CC', numero_documento: '',
        fecha_nacimiento: '', genero: 'O', direccion: '', telefono: '', email_contacto: '', tipo_usuario: '', user_id: null
    });

    useEffect(() => {
        if (!roles) return; // wait auth
        cargarDatos();
    }, [roles]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [p, t] = await Promise.all([patientService.getAll(), patientService.getTiposPaciente()]);
            setPacientes(Array.isArray(p) ? p : []);
            setTipos(Array.isArray(t) ? t : []);
        } catch (error) {
            console.error('Error cargando pacientes/tipos', error);
            Swal.fire('Error', 'No se pudieron cargar los pacientes.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Role guard: only admins can access
    const isAdmin = () => {
        // Superuser/staff from token should always pass
        if (user && (user.is_superuser || user.is_staff)) return true;
        if (!roles) return false;
        const rn = roles.map(r => (r || '').toString().toLowerCase());
        return rn.includes('admin') || rn.includes('administrador') || rn.includes('superuser') || rn.includes('staff');
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ nombre: '', apellido: '', tipo_documento: 'CC', numero_documento: '', fecha_nacimiento: '', genero: 'O', direccion: '', telefono: '', email_contacto: '', tipo_usuario: '', user_id: null });
        setModalOpen(true);
    };

    const openEdit = (p) => {
        setEditing(p);
        setForm({ ...p, tipo_usuario: p.tipo_usuario || '' });
        setModalOpen(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        const required = ['nombre', 'tipo_documento', 'numero_documento', 'fecha_nacimiento', 'genero'];
        for (const f of required) {
            if (!form[f]) return `El campo ${f} es requerido`;
        }
        return null;
    };

    const handleSave = async () => {
        const err = validateForm();
        if (err) return Swal.fire('Validación', err, 'warning');

        try {
            if (editing) {
                await patientService.update(editing.id, form);
                Swal.fire('Guardado', 'Paciente actualizado.', 'success');
            } else {
                await patientService.create(form);
                Swal.fire('Creado', 'Paciente creado correctamente.', 'success');
            }
            setModalOpen(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            const msg = error?.response?.data ? JSON.stringify(error.response.data) : 'Error al guardar';
            Swal.fire('Error', msg, 'error');
        }
    };

    const handleToggleActivo = async (p) => {
        try {
            await patientService.update(p.id, { activo: !p.activo });
            cargarDatos();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cambiar el estado.', 'error');
        }
    };

    const handleAssignUser = async (p) => {
        const { value: userId } = await Swal.fire({
            title: 'Asignar user_id',
            input: 'number',
            inputLabel: `Asignar user_id a ${p.nombre}`,
            inputValue: p.user_id || '',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#14b8a6'
        });
        if (userId !== undefined && userId !== '') {
            try {
                await patientService.update(p.id, { user_id: parseInt(userId) });
                Swal.fire('Listo', 'user_id asignado.', 'success');
                cargarDatos();
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo asignar user_id.', 'error');
            }
        }
    };

    const handleBulkImport = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            // Expect header: nombre,apellido,tipo_documento,numero_documento,fecha_nacimiento,genero,email_contacto
            const header = lines.shift().split(',').map(h => h.trim());
            const items = lines.map(line => {
                const cols = line.split(',').map(c => c.trim());
                const obj = {};
                header.forEach((h, i) => obj[h] = cols[i] || '');
                return obj;
            });

            const confirm = await Swal.fire({ title: 'Importar CSV', html: `Se importarán ${items.length} filas. ¿Continuar?`, showCancelButton: true, confirmButtonText: 'Importar', confirmButtonColor: '#14b8a6' });
            if (!confirm.isConfirmed) return;

            const results = { ok: 0, failed: 0 };
            for (const it of items) {
                try {
                    // Basic mapping: ensure required keys exist
                    const payload = {
                        nombre: it.nombre || 'N/A', apellido: it.apellido || '', tipo_documento: it.tipo_documento || 'CC', numero_documento: it.numero_documento || '', fecha_nacimiento: it.fecha_nacimiento || '2000-01-01', genero: it.genero || 'O', email_contacto: it.email_contacto || ''
                    };
                    await patientService.create(payload);
                    results.ok += 1;
                } catch (error) {
                    results.failed += 1;
                }
            }
            Swal.fire('Importación completada', `Éxitos: ${results.ok} - Fallidos: ${results.failed}`, 'info');
            cargarDatos();
        };
        reader.readAsText(file);
    };

    // Filtering and paging
    const filtered = pacientes.filter(p => {
        const q = query.toLowerCase();
        return !q || (p.nombre && p.nombre.toLowerCase().includes(q)) || (p.numero_documento && p.numero_documento.toLowerCase().includes(q)) || (p.email_contacto && p.email_contacto.toLowerCase().includes(q));
    });
    const pages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const visible = filtered.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

    if (!isAdmin()) return (<div className="p-6 text-center font-bold text-gray-600">No autorizado</div>);

    return (
        <div className="max-w-7xl mx-auto p-4">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <FaUserTie className="text-teal-600"/> Gestión de Pacientes
                </h1>
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Total: <b>{filtered.length}</b>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaSearch className="text-gray-400" /></div>
                    <input type="text" placeholder="Buscar por nombre, documento o email..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
                </div>
                <button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md transition-all whitespace-nowrap">
                    <FaPlus /> Crear Paciente
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                <th className="px-6 py-4">Información del Paciente</th>
                                <th className="px-6 py-4">Documento</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Tipo de Paciente</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 animate-pulse">Cargando pacientes...</td></tr>
                            ) : visible.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500 italic">No hay pacientes registrados.</td></tr>
                            ) : visible.map(p => (
                                <tr key={p.id} className="hover:bg-teal-50 transition duration-150">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-bold text-gray-900">{p.nombre} {p.apellido}</span>
                                            {p.user_id && <span className="text-xs text-gray-500">User ID: {p.user_id}</span>}
                                            {!p.user_id && <span className="text-xs text-orange-600 font-medium">Sin usuario vinculado</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">{p.tipo_documento} {p.numero_documento}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {p.email_contacto ? <div>{p.email_contacto}</div> : null}
                                        {p.telefono ? <div className="text-xs text-gray-500">{p.telefono}</div> : null}
                                        {!p.email_contacto && !p.telefono && <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                            p.tipo_usuario_nombre ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                                        }`}>
                                            {p.tipo_usuario_nombre || 'Sin clasificar'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleToggleActivo(p)} className={`text-lg transition-colors ${p.activo ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`} title={p.activo ? 'Desactivar' : 'Activar'}>
                                            {p.activo ? <FaToggleOn /> : <FaToggleOff />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openEdit(p)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Editar">
                                                <FaEdit size={16} />
                                            </button>
                                            <button onClick={() => handleAssignUser(p)} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors" title="Asignar/cambiar user_id">
                                                <FaUserTie size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {visible.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                        <div>
                            <label className="text-sm font-medium text-gray-600 mr-3">Importar CSV:</label>
                            <input type="file" accept=".csv" onChange={e => handleBulkImport(e.target.files[0])} className="text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"><FaChevronLeft /></button>
                            <span className="text-sm font-medium text-gray-700">Página {page} / {pages}</span>
                            <button disabled={page>=pages} onClick={() => setPage(p => Math.min(pages, p+1))} className="px-3 py-1 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"><FaChevronRight /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={() => setModalOpen(false)}></div>
                        <div className="bg-white rounded-xl overflow-hidden shadow-2xl transform transition-all sm:max-w-lg w-full z-10">
                            <div className="bg-white px-6 py-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                                    <div className="p-2 bg-teal-100 rounded-lg text-teal-600"><FaUserTie /></div>
                                    {editing ? 'Editar Paciente' : 'Crear Paciente'}
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Nombre *</label><input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none transition-all" /></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Apellido</label><input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none transition-all" /></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-1"><label className="text-xs font-bold text-gray-500 uppercase">Tipo Doc *</label><select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none">
                                            <option value="CC">CC</option>
                                            <option value="TI">TI</option>
                                            <option value="CE">CE</option>
                                            <option value="NIT">NIT</option>
                                        </select></div>
                                        <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Número Documento *</label><input name="numero_documento" value={form.numero_documento} onChange={handleChange} placeholder="Número documento" className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Fecha Nacimiento *</label><input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Género *</label><select name="genero" value={form.genero} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none">
                                            <option value="M">Masculino</option>
                                            <option value="F">Femenino</option>
                                            <option value="O">Otro</option>
                                        </select></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input name="email_contacto" value={form.email_contacto} onChange={handleChange} placeholder="Email" className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Teléfono</label><input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                    </div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Tipo de Paciente</label><select name="tipo_usuario" value={form.tipo_usuario} onChange={handleChange} className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none">
                                        <option value="">-- Seleccione tipo --</option>
                                        {tipos.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}
                                    </select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase">Dirección</label><input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección" className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t">
                                <button onClick={handleSave} className="bg-teal-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-teal-700 shadow-md transition-all">Guardar Cambios</button>
                                <button onClick={() => setModalOpen(false)} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg font-medium hover:bg-gray-50 transition-all">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionPacientes;
