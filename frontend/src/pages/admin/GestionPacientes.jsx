import React, { useEffect, useState, useContext } from 'react';
import { patientService } from '../../services/patientService';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';

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
            showCancelButton: true
        });
        if (userId !== undefined) {
            try {
                await patientService.update(p.id, { user_id: userId });
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

            const confirm = await Swal.fire({ title: 'Importar CSV', html: `Se importarán ${items.length} filas. Continuar?`, showCancelButton: true, confirmButtonText: 'Importar' });
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

    if (!isAdmin()) return (<div className="p-6">No autorizado</div>);

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Gestión de Pacientes</h2>
                <div className="flex items-center gap-2">
                    <input placeholder="Buscar nombre, doc o email" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="px-3 py-2 border rounded" />
                    <button onClick={openCreate} className="bg-green-600 text-white px-4 py-2 rounded">Crear paciente</button>
                </div>
            </div>

            <div className="bg-white shadow rounded overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-3 text-left">Nombre</th>
                            <th className="p-3 text-left">Documento</th>
                            <th className="p-3 text-left">Contacto</th>
                            <th className="p-3 text-left">Tipo</th>
                            <th className="p-3 text-left">Activo</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="p-6">Cargando...</td></tr>
                        ) : visible.length === 0 ? (
                            <tr><td colSpan="6" className="p-6">No hay pacientes.</td></tr>
                        ) : visible.map(p => (
                            <tr key={p.id} className="border-t hover:bg-gray-50">
                                <td className="p-3">{p.nombre} {p.apellido}</td>
                                <td className="p-3">{p.tipo_documento} {p.numero_documento}</td>
                                <td className="p-3">{p.email_contacto || p.telefono || '-'}</td>
                                <td className="p-3">{p.tipo_usuario_nombre || '-'}</td>
                                <td className="p-3">{p.activo ? 'Sí' : 'No'}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => openEdit(p)} className="text-blue-600 mr-2">Editar</button>
                                    <button onClick={() => handleToggleActivo(p)} className="text-yellow-600 mr-2">{p.activo ? 'Desactivar' : 'Activar'}</button>
                                    <button onClick={() => handleAssignUser(p)} className="text-green-600 mr-2">Asignar user_id</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between mt-4">
                <div>
                    <label className="mr-2">Importar CSV:</label>
                    <input type="file" accept=".csv" onChange={e => handleBulkImport(e.target.files[0])} />
                </div>
                <div className="flex items-center gap-2">
                    <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 border rounded">Anterior</button>
                    <div>Página {page} / {pages}</div>
                    <button disabled={page>=pages} onClick={() => setPage(p => Math.min(pages, p+1))} className="px-3 py-1 border rounded">Siguiente</button>
                </div>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center p-6 z-50">
                    <div className="bg-white rounded shadow-lg w-full max-w-2xl p-6">
                        <h3 className="text-xl font-bold mb-4">{editing ? 'Editar paciente' : 'Crear paciente'}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="p-2 border rounded" />
                            <input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" className="p-2 border rounded" />
                            <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className="p-2 border rounded">
                                <option value="CC">CC</option>
                                <option value="TI">TI</option>
                                <option value="CE">CE</option>
                                <option value="NIT">NIT</option>
                            </select>
                            <input name="numero_documento" value={form.numero_documento} onChange={handleChange} placeholder="Número documento" className="p-2 border rounded" />
                            <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} className="p-2 border rounded" />
                            <select name="genero" value={form.genero} onChange={handleChange} className="p-2 border rounded">
                                <option value="M">M</option>
                                <option value="F">F</option>
                                <option value="O">Otro</option>
                            </select>
                            <input name="email_contacto" value={form.email_contacto} onChange={handleChange} placeholder="Email" className="p-2 border rounded" />
                            <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" className="p-2 border rounded" />
                            <select name="tipo_usuario" value={form.tipo_usuario} onChange={handleChange} className="p-2 border rounded col-span-2">
                                <option value="">-- Seleccione tipo --</option>
                                {tipos.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}
                            </select>
                            <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección" className="p-2 border rounded col-span-2" />
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionPacientes;
