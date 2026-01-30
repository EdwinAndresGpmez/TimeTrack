import React, { useEffect, useState, useContext } from 'react';
import { patientService } from '../../services/patientService';
import { authService } from '../../services/authService';
import { AuthContext } from '../../context/AuthContext';
import { citasService } from '../../services/citasService'; // Importamos el servicio de citas
import Swal from 'sweetalert2';
import { 
    FaPlus, FaEdit, FaToggleOn, FaToggleOff, FaUserTie, 
    FaSearch, FaChevronLeft, FaChevronRight, FaKey, FaUserCheck, FaDownload,
    FaLock, FaLockOpen, FaHistory 
} from 'react-icons/fa';

const ITEMS_PER_PAGE = 10;

const GestionPacientes = () => {
    // --- CONTEXTO ---
    const { user, permissions } = useContext(AuthContext);
    const roles = permissions?.roles || []; 

    // --- ESTADOS ---
    const [pacientes, setPacientes] = useState([]);
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Búsqueda y Paginación
    const [userQuery, setUserQuery] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        nombre: '', apellido: '', tipo_documento: 'CC', numero_documento: '',
        fecha_nacimiento: '', genero: 'O', direccion: '', telefono: '', email_contacto: '', tipo_usuario: '', user_id: null
    });

    useEffect(() => {
        if (user) {
            cargarDatos();
        }
    }, [user]);

    // --- CARGA DE DATOS (FUSIÓN DE MICROSERVICIOS) ---
    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [listaPacientes, tipos, reporteFaltas] = await Promise.all([
                patientService.getAll(),
                patientService.getTiposPaciente(),
                citasService.getReporteInasistencias()
            ]);

            const pacientesRaw = Array.isArray(listaPacientes) ? listaPacientes : [];
            const tiposRaw = Array.isArray(tipos) ? tipos : [];

            const pacientesEnriquecidos = pacientesRaw.map(p => {
                const estadoFaltas = reporteFaltas && reporteFaltas[p.id.toString()];
                
                if (estadoFaltas) {
                    let inasistenciasReales = estadoFaltas.inasistencias; // Valor original (Histórico)
                    let estaBloqueado = estadoFaltas.bloqueado_por_inasistencias;
                    
                    // --- LÓGICA DE COMPARACIÓN DE FECHAS ---
                    if (p.ultima_fecha_desbloqueo && estadoFaltas.ultima_falta) {
                        const fechaReset = new Date(p.ultima_fecha_desbloqueo);
                        const fechaUltimaFalta = new Date(estadoFaltas.ultima_falta);
                        
                        // CORRECCIÓN: Usamos fechaUltimaFalta <= fechaReset para ser consistentes con el backend
                        // Si la última falta fue antes o el mismo momento del reset, ya no cuenta.
                        if (fechaUltimaFalta <= fechaReset) {
                            estaBloqueado = false;
                            inasistenciasReales = 0; // <--- TRUCO VISUAL: Mostramos 0 al usuario
                        }
                    }

                    return {
                        ...p,
                        inasistencias: inasistenciasReales, // Ahora mostramos 0 si está desbloqueado
                        inasistencias_historicas: estadoFaltas.inasistencias, // Guardamos el dato real por si acaso
                        bloqueado_por_inasistencias: estaBloqueado
                    };
                }
                
                return { ...p, inasistencias: 0, bloqueado_por_inasistencias: false };
            });

            setPacientes(pacientesEnriquecidos);
            setTipos(tiposRaw);

        } catch (error) {
            console.error(error);
            Swal.fire('Aviso', 'Error de conexión. Se cargarán datos parciales.', 'warning');
            try {
                const p = await patientService.getAll();
                setPacientes(Array.isArray(p) ? p : []);
            } catch (e) {
                setPacientes([]);
            }
        } finally {
            setLoading(false);
        }
    };
    const isAdmin = () => {
        if (user && (user.is_superuser || user.is_staff)) return true;
        const rn = roles.map(r => (r || '').toString().toLowerCase());
        return rn.includes('admin') || rn.includes('administrador') || rn.includes('superuser') || rn.includes('staff');
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

    // --- ACCIONES ---

    const handleAssignUserQuick = async (p) => {
        await Swal.fire({
            title: `Vincular Usuario a ${p.nombre}`,
            html: `
                <div class="text-left">
                    <p class="text-[11px] text-gray-500 mb-2 uppercase font-bold">Buscar por Nombre, Email o Documento:</p>
                    <input id="swal-user-search" class="swal2-input" style="margin: 0; width: 100%; font-size: 14px;" placeholder="Ej: Juan Perez o 1020...">
                    <div id="swal-results-container" class="mt-3 max-h-60 overflow-y-auto border rounded-xl bg-gray-50 divide-y divide-gray-200">
                        <p class="p-4 text-center text-gray-400 text-sm">Ingrese 3 caracteres para buscar...</p>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
            didOpen: () => {
                const input = document.getElementById('swal-user-search');
                const container = document.getElementById('swal-results-container');

                input.addEventListener('input', async (e) => {
                    const val = e.target.value;
                    if (val.length < 3) return;

                    container.innerHTML = '<div class="p-4 text-center"><div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div></div>';
                    
                    try {
                        const results = await authService.getAllUsers(val);
                        if (results.length === 0) {
                            container.innerHTML = '<p class="p-4 text-center text-gray-400 text-sm">No se encontraron resultados.</p>';
                            return;
                        }

                        container.innerHTML = results.map(u => `
                            <div class="swal-user-item p-3 hover:bg-teal-50 cursor-pointer flex items-center gap-3 transition-colors" 
                                 data-id="${u.id}" data-name="${u.nombre}">
                                <div class="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs uppercase">
                                    ${u.nombre.charAt(0)}
                                </div>
                                <div class="flex-1 overflow-hidden">
                                    <p class="text-sm font-bold text-gray-800 truncate">${u.nombre}</p>
                                    <p class="text-[10px] text-gray-500 font-mono italic">${u.documento} • ${u.email}</p>
                                </div>
                                <span class="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-400 font-bold">ID ${u.id}</span>
                            </div>
                        `).join('');

                        document.querySelectorAll('.swal-user-item').forEach(item => {
                            item.addEventListener('click', async () => {
                                const id = item.getAttribute('data-id');
                                const name = item.getAttribute('data-name');
                                Swal.close();
                                
                                const confirm = await Swal.fire({
                                    title: '¿Confirmar vínculo?',
                                    text: `Asociarás a ${p.nombre} con el usuario ${name}`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'Sí, vincular',
                                    confirmButtonColor: '#14b8a6'
                                });

                                if (confirm.isConfirmed) {
                                    try {
                                        await patientService.update(p.id, { user_id: id });
                                        Swal.fire('¡Listo!', 'Vinculación exitosa.', 'success');
                                        cargarDatos();
                                    } catch (err) {
                                        console.error(err);
                                        Swal.fire('Error', 'No se pudo vincular.', 'error');
                                    }
                                }
                            });
                        });
                    } catch (err) {
                        console.error(err);
                        container.innerHTML = '<p class="p-4 text-center text-red-500 text-sm">Error en el servidor.</p>';
                    }
                });
            }
        });
    };

    // --- NUEVO: DESBLOQUEO DE INASISTENCIAS ---
    const handleUnlockInasistencias = async (p) => {
        const confirm = await Swal.fire({
            title: '¿Desbloquear Paciente?',
            html: `
                <div class="text-left text-sm">
                    <p>El paciente tiene inasistencias que bloquean su acceso.</p>
                    <p class="mt-2 text-gray-500">
                        Al confirmar, se actualizará su <b>fecha de corte</b> al día de hoy. 
                        Las inasistencias antiguas <b>se mantendrán en el historial</b> pero ya no contarán para el bloqueo.
                    </p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, aplicar fecha de corte',
            confirmButtonColor: '#10b981', // Verde éxito
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            try {
                // CAMBIO IMPORTANTE: Llamamos al patientService (MS Pacientes)
                // Usamos el método resetInasistencias que actualiza la fecha de corte
                if (patientService.resetInasistencias) {
                    await patientService.resetInasistencias(p.id);
                } else {
                    // Fallback si no está definido el método específico, intentamos update manual
                    // (Asegúrate de tener el endpoint en el backend)
                    await patientService.update(p.id, { reset_inasistencias: true });
                }
                
                Swal.fire('Desbloqueado', 'El contador se ha reiniciado desde hoy.', 'success');
                cargarDatos(); // Recargar tabla para ver el candado abrirse
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo realizar el desbloqueo.', 'error');
            }
        }
    };

    const openCreate = () => {
        setEditing(null);
        setUserQuery('');
        setUserResults([]);
        setForm({ nombre: '', apellido: '', tipo_documento: 'CC', numero_documento: '', fecha_nacimiento: '', genero: 'O', direccion: '', telefono: '', email_contacto: '', tipo_usuario: '', user_id: null });
        setModalOpen(true);
    };

    const openEdit = (p) => {
        setEditing(p);
        setForm({ ...p, tipo_usuario: p.tipo_usuario || '' });
        setUserQuery(p.user_id ? `ID Actual: ${p.user_id}` : '');
        setUserResults([]);
        setModalOpen(true);
    };

    const handleChange = async (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));

        if (name === 'numero_documento' && value.length > 5 && !form.user_id) {
            try {
                const results = await authService.getAllUsers(value);
                const match = results.find(u => u.documento === value);
                if (match) {
                    setForm(prev => ({ ...prev, user_id: match.id }));
                    setUserQuery(`${match.nombre} (${match.documento})`);
                }
            } catch (err) { console.log("Auto-búsqueda fallida"); }
        }
    };

    const handleSave = async () => {
        const required = ['nombre', 'tipo_documento', 'numero_documento', 'fecha_nacimiento', 'genero'];
        for (const f of required) { if (!form[f]) return Swal.fire('Validación', `El campo ${f} es obligatorio`, 'warning'); }

        try {
            if (editing) {
                await patientService.update(editing.id, form);
                Swal.fire('Guardado', 'Registro actualizado.', 'success');
            } else {
                await patientService.create(form);
                Swal.fire('Creado', 'Paciente registrado con éxito.', 'success');
            }
            setModalOpen(false);
            cargarDatos();
        } catch (error) { 
            console.error(error);
            Swal.fire('Error', 'Error al procesar la solicitud.', 'error'); 
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

    const downloadSampleCSV = () => {
        const headers = "nombre,apellido,tipo_documento,numero_documento,fecha_nacimiento,genero,email_contacto\n";
        const sampleData = "Juan,Perez,CC,12345678,1990-01-01,M,juan.perez@example.com";
        const csvContent = "data:text/csv;charset=utf-8," + headers + sampleData;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_pacientes.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkImport = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            const header = lines.shift().split(',').map(h => h.trim());
            const items = lines.map(line => {
                const cols = line.split(',').map(c => c.trim());
                const obj = {};
                header.forEach((h, i) => obj[h] = cols[i] || '');
                return obj;
            });

            const confirm = await Swal.fire({ 
                title: 'Importar CSV', 
                html: `Se procesarán <b>${items.length}</b> registros.`, 
                showCancelButton: true, confirmButtonText: 'Importar'
            });
            if (!confirm.isConfirmed) return;

            for (const it of items) {
                try {
                    await patientService.create({
                        nombre: it.nombre || 'N/A', apellido: it.apellido || '', tipo_documento: it.tipo_documento || 'CC', numero_documento: it.numero_documento || '', 
                        fecha_nacimiento: it.fecha_nacimiento || '2000-01-01', genero: it.genero || 'O', email_contacto: it.email_contacto || ''
                    });
                } catch (error) { console.error("Error en fila"); }
            }
            Swal.fire('Terminado', 'Proceso de importación finalizado.', 'info');
            cargarDatos();
        };
        reader.readAsText(file);
    };

    const filtered = pacientes.filter(p => {
        const q = query.toLowerCase();
        return !q || (p.nombre && p.nombre.toLowerCase().includes(q)) || (p.numero_documento && p.numero_documento.toLowerCase().includes(q));
    });

    const pages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const visible = filtered.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

    if (!isAdmin()) return (<div className="p-20 text-center font-bold text-gray-600">No autorizado</div>);

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
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    <input type="text" placeholder="Buscar por nombre o documento..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
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
                                <th className="px-6 py-4">Paciente</th>
                                <th className="px-6 py-4">Documento</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Clasificación</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 animate-pulse">Cargando base de datos...</td></tr>
                            ) : visible.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500 italic">No hay registros.</td></tr>
                            ) : visible.map(p => (
                                <tr key={p.id} className="hover:bg-teal-50 transition duration-150 group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-bold text-gray-900">{p.nombre} {p.apellido}</span>
                                            {p.user_id ? (
                                                <span className="text-[10px] text-teal-600 flex items-center gap-1 font-bold italic"><FaUserCheck /> Vinculado (ID: {p.user_id})</span>
                                            ) : (
                                                <span className="text-[10px] text-orange-500 font-medium italic">Sin cuenta de acceso</span>
                                            )}
                                            {/* Indicador visual de inasistencias */}
                                            {p.inasistencias > 0 && (
                                                <span className="text-[9px] text-red-500 font-bold bg-red-50 px-1.5 rounded w-max mt-1 flex items-center gap-1">
                                                    <FaHistory/> {p.inasistencias} Faltas
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-700">{p.tipo_documento} {p.numero_documento}</td>
                                    <td className="px-6 py-4 text-xs text-gray-600">
                                        <div className="truncate max-w-[150px]">{p.email_contacto || '-'}</div>
                                        <div className="text-gray-400 font-bold">{p.telefono || ''}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                            p.tipo_usuario_nombre ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                                        }`}>
                                            {p.tipo_usuario_nombre || 'Particular'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleToggleActivo(p)} className={`text-lg transition-colors ${p.activo ? 'text-green-600' : 'text-red-400'}`}>
                                            {p.activo ? <FaToggleOn /> : <FaToggleOff />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            {/* EDITAR */}
                                            <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Editar Ficha">
                                                <FaEdit size={16} />
                                            </button>
                                            
                                            {/* VINCULAR */}
                                            <button onClick={() => handleAssignUserQuick(p)} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-all" title="Vínculo Rápido de Usuario">
                                                <FaKey size={14} />
                                            </button>

                                            {/* DESBLOQUEO */}
                                            <button 
                                                onClick={() => handleUnlockInasistencias(p)} 
                                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all" 
                                                title="Gestionar Bloqueo por Inasistencias"
                                            >
                                                {p.bloqueado_por_inasistencias ? (
                                                    <FaLock size={14} className="text-red-500" />
                                                ) : (
                                                    <FaLockOpen size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Paginación */}
                <div className="px-6 py-4 bg-gray-50 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-400 uppercase">Carga Masiva:</label>
                        <input type="file" accept=".csv" onChange={e => handleBulkImport(e.target.files[0])} className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer" />
                        <button onClick={downloadSampleCSV} title="Plantilla CSV" className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-full transition-colors flex items-center gap-1">
                            <FaDownload size={12} /> <span className="text-[10px] font-bold">Plantilla</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="p-2 bg-white border rounded disabled:opacity-30"><FaChevronLeft size={10}/></button>
                        <span className="text-xs font-bold text-gray-600">Pág. {page} / {pages}</span>
                        <button disabled={page>=pages} onClick={() => setPage(p => Math.min(pages, p+1))} className="p-2 bg-white border rounded disabled:opacity-30"><FaChevronRight size={10}/></button>
                    </div>
                </div>
            </div>

            {/* Modal Principal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-screen px-4 py-8">
                        <div className="fixed inset-0 bg-gray-900/60" onClick={() => setModalOpen(false)}></div>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl transform transition-all sm:max-w-2xl w-full z-10 border border-gray-100">
                            {/* ... FORMULARIO DEL MODAL (Se mantiene igual) ... */}
                            <div className="bg-white px-8 py-6">
                                <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-3 border-b pb-5">
                                    <div className="p-2.5 bg-teal-600 rounded-xl text-white shadow-lg"><FaUserTie /></div>
                                    {editing ? 'Ficha Médica del Paciente' : 'Nuevo Registro Clínico'}
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-l-2 border-teal-500 pl-2">Información Básica</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-[10px] font-bold text-gray-500">Nombre *</label><input name="nombre" value={form.nombre} onChange={handleChange} className="w-full border-gray-200 border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                            <div><label className="text-[10px] font-bold text-gray-500">Apellido</label><input name="apellido" value={form.apellido} onChange={handleChange} className="w-full border-gray-200 border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">Tipo *</label><select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className="w-full border-gray-200 border rounded-lg p-2.5 text-sm outline-none">
                                                <option value="CC">CC</option><option value="TI">TI</option><option value="CE">CE</option><option value="NIT">NIT</option>
                                            </select></div>
                                            <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500">Documento *</label><input name="numero_documento" value={form.numero_documento} onChange={handleChange} className="w-full border-gray-200 border rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-[10px] font-bold text-gray-500">Fecha Nac. *</label><input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} className="w-full border-gray-200 border rounded-lg p-2.5 text-sm outline-none" /></div>
                                            <div><label className="text-[10px] font-bold text-gray-500">Género *</label><select name="genero" value={form.genero} onChange={handleChange} className="w-full border-gray-200 border rounded-lg p-2.5 text-sm outline-none">
                                                <option value="M">Masculino</option><option value="F">Femenino</option><option value="O">Otro</option>
                                            </select></div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-l-2 border-teal-500 pl-2">Contacto y Régimen</h4>
                                        <div><label className="text-[10px] font-bold text-gray-500">Email</label><input name="email_contacto" value={form.email_contacto} onChange={handleChange} className="w-full border-gray-200 border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                        <div><label className="text-[10px] font-bold text-gray-500">Teléfono</label><input name="telefono" value={form.telefono} onChange={handleChange} className="w-full border-gray-200 border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                                        <div><label className="text-[10px] font-bold text-gray-500">Clasificación de Paciente</label><select name="tipo_usuario" value={form.tipo_usuario} onChange={handleChange} className="w-full border-gray-200 border rounded-lg p-2.5 text-sm outline-none bg-teal-50 font-bold text-teal-800">
                                            <option value="">-- Particular --</option>
                                            {tipos.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}
                                        </select></div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                                    <h4 className="text-xs font-black text-teal-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <FaKey /> Configurar Cuenta de Acceso
                                    </h4>
                                    
                                    <div className="relative">
                                        <input type="text" placeholder="Vincular con usuario del sistema..." className="w-full border-gray-300 border rounded-xl p-3 pl-10 text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                                            value={userQuery} onChange={(e) => searchUsers(e.target.value)} />
                                        <FaSearch className="absolute left-3 top-4 text-gray-400" />

                                        {userResults.length > 0 && (
                                            <div className="absolute z-50 w-full bg-white border border-gray-100 shadow-2xl rounded-xl mt-2 max-h-52 overflow-y-auto ring-1 ring-black/5">
                                                {userResults.map(u => (
                                                    <div key={u.id} onClick={() => { setForm({...form, user_id: u.id}); setUserQuery(`${u.nombre} (${u.documento})`); setUserResults([]); }}
                                                        className="p-3 hover:bg-teal-50 cursor-pointer border-b border-gray-50 last:border-none flex justify-between items-center transition-colors">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-800">{u.nombre}</span>
                                                            <span className="text-[10px] text-gray-500 font-mono italic">{u.documento}</span>
                                                        </div>
                                                        <span className="text-[9px] bg-gray-100 px-2 py-1 rounded-full text-gray-400 font-black tracking-widest">ID {u.id}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {form.user_id && (
                                        <div className="mt-3 flex items-center justify-between bg-teal-50 px-4 py-2.5 rounded-xl border border-teal-100 transition-all animate-fade-in">
                                            <div className="flex items-center gap-2 text-teal-700">
                                                <FaUserCheck className="animate-pulse" />
                                                <span className="text-xs font-black uppercase tracking-tighter">Cuenta vinculada correctamente</span>
                                            </div>
                                            <button type="button" onClick={() => { setForm({...form, user_id: null}); setUserQuery(''); }} className="text-[10px] font-black text-red-500 hover:text-red-700 underline uppercase tracking-tight">Quitar vínculo</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 px-8 py-5 flex flex-row-reverse gap-3 border-t border-gray-100">
                                <button onClick={handleSave} className="bg-teal-600 text-white px-7 py-2.5 rounded-xl font-black text-sm hover:bg-teal-700 shadow-xl transition-all active:scale-95">
                                    {editing ? 'Guardar Cambios' : 'Confirmar Registro'}
                                </button>
                                <button onClick={() => setModalOpen(false)} className="bg-white border border-gray-200 text-gray-500 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionPacientes;