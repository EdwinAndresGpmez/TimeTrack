import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import { patientService } from '../../services/patientService'; 
import Swal from 'sweetalert2';
import { 
    FaEdit, FaKey, FaUserShield, FaSearch, FaChevronLeft, FaChevronRight, 
    FaFilter, FaStethoscope, FaEnvelope, FaPhone, FaIdCard, FaPen 
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { FaUsers } from 'react-icons/fa';

const AdminUsuarios = () => {
    // --- ESTADOS DE DATOS ---
    const [users, setUsers] = useState([]); 
    const [filteredUsers, setFilteredUsers] = useState([]); 
    const [availableGroups, setAvailableGroups] = useState([]);
    const [tiposPaciente, setTiposPaciente] = useState([]); 
    
    // Diccionario para acceso rápido: { user_id: { datos_paciente } }
    const [patientsMap, setPatientsMap] = useState({}); 

    const [loading, setLoading] = useState(true);

    // --- PAGINACIÓN ---
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(10); 

    // --- FILTROS ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('todos');

    // --- MODAL EDITAR AUTH ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '', email: '', tipo_documento: 'CC', documento: '', numero: ''
    });

    // 1. CARGA INICIAL
    useEffect(() => {
        cargarDatos();
    }, []);

    // 2. FILTRADO
    useEffect(() => {
        let result = users;

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(u => 
                u.nombre.toLowerCase().includes(lowerTerm) ||
                u.email.toLowerCase().includes(lowerTerm) ||
                u.documento.includes(lowerTerm)
            );
        }

        if (filterRole !== 'todos') {
            if (filterRole === 'sin_rol') {
                result = result.filter(u => u.groups.length === 0);
            } else {
                result = result.filter(u => hasRole(u, filterRole));
            }
        }

        setFilteredUsers(result);
        setCurrentPage(1); 
    }, [users, searchTerm, filterRole]);

    // HELPER: Detectar Rol (Insensible a mayúsculas)
    const hasRole = (user, roleName) => {
        if (!user || !user.groups) return false;
        return user.groups.some(g => g.toLowerCase() === roleName.toLowerCase());
    };

    // 3. CARGA DE DATOS COMPLETA
    const cargarDatos = async () => {
        try {
            setLoading(true);
            
            // Ejecutamos todas las peticiones en paralelo
            const [usersData, gruposData, tiposData, pacientesData] = await Promise.all([
                authService.getAllUsers(),
                authService.getGroups(),
                patientService.getTiposPaciente(),
                patientService.getAll() // Traemos TODOS los pacientes para mapearlos
            ]);

            // Creamos el mapa de pacientes para acceso instantáneo
            const map = {};
            pacientesData.forEach(p => {
                if (p.user_id) {
                    map[p.user_id] = p;
                }
            });

            setUsers(usersData);
            setFilteredUsers(usersData); 
            setAvailableGroups(gruposData);
            setTiposPaciente(tiposData);
            setPatientsMap(map);

        } catch (error) {
            console.error("Error cargando datos:", error);
            Swal.fire('Error', 'Error de conexión cargando datos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- ACCIONES AUTH ---
    
    const handleToggleActive = async (user) => {
        try {
            await authService.adminUpdateUser(user.id, { is_active: !user.is_active });
            const updatedUsers = users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u);
            setUsers(updatedUsers);
            Swal.fire({
                icon: 'success', title: !user.is_active ? 'Activado' : 'Desactivado', 
                timer: 1000, showConfirmButton: false
            });
        } catch (error) { Swal.fire('Error', 'No se pudo cambiar el estado', 'error'); }
    };

    const handleChangePassword = async (user) => {
        const { value: password } = await Swal.fire({
            title: `Password para ${user.nombre}`,
            input: 'password',
            inputPlaceholder: 'Nueva contraseña...',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            inputValidator: (val) => { if (!val || val.length < 6) return 'Mínimo 6 caracteres'; }
        });
        if (password) {
            try {
                await authService.adminChangePassword(user.id, password);
                Swal.fire('Éxito', 'Contraseña actualizada', 'success');
            } catch (error) { Swal.fire('Error', 'No se pudo actualizar', 'error'); }
        }
    };

    const handleEditGroups = async (user) => {
        const groupsHtml = availableGroups.map(group => {
            const checked = user.groups.includes(group) ? 'checked' : '';
            return `<div style="text-align:left; margin-bottom:5px;">
                <input type="checkbox" id="chk-${group}" value="${group}" ${checked}> 
                <label for="chk-${group}" style="margin-left:8px;">${group}</label>
            </div>`;
        }).join('');

        const { value: formValues } = await Swal.fire({
            title: `Roles: ${user.nombre}`, html: groupsHtml, showCancelButton: true,
            preConfirm: () => {
                const selected = [];
                availableGroups.forEach(g => { if (document.getElementById(`chk-${g}`).checked) selected.push(g); });
                return selected;
            }
        });

        if (formValues) {
            try {
                await authService.adminUpdateUser(user.id, { groups: formValues });
                const updatedUsers = users.map(u => u.id === user.id ? { ...u, groups: formValues } : u);
                setUsers(updatedUsers);
                Swal.fire('Roles actualizados', '', 'success');
            } catch (error) { Swal.fire('Error', 'Fallo al actualizar roles', 'error'); }
        }
    };

    // --- ACCIÓN: EDITAR CLASIFICACIÓN (Con actualización en tiempo real) ---

    const handleEditTipoPaciente = async (user) => {
        if (!hasRole(user, 'paciente')) return;

        // 1. Obtenemos datos del mapa o fetch si no existe
        let perfil = patientsMap[user.id];
        
        if (!perfil) {
            // Intento de fallback (por si se acaba de crear y no refrescamos)
            try {
                perfil = await patientService.getProfileByUserId(user.id);
            } catch (e) { console.error(e); }
        }

        if (!perfil) {
            return Swal.fire('Sin Ficha', 'El usuario es paciente pero no tiene ficha clínica asociada.', 'warning');
        }

        // 2. Preparar Select
        let currentTipoId = '';
        if (perfil.tipo_usuario) {
            currentTipoId = (typeof perfil.tipo_usuario === 'object') ? perfil.tipo_usuario.id : perfil.tipo_usuario;
        }

        const optionsHtml = tiposPaciente.map(tipo => 
            `<option value="${tipo.id}" ${parseInt(currentTipoId) === tipo.id ? 'selected' : ''}>${tipo.nombre}</option>`
        ).join('');

        // 3. Modal
        const { value: nuevoTipoId } = await Swal.fire({
            title: `Clasificación: ${user.nombre}`,
            html: `
                <p class="text-sm text-gray-600 mb-3">Entidad / Vinculación:</p>
                <select id="swal-tipo-paciente" class="swal2-select" style="width: 80%; display: flex; margin: 0 auto;">
                    <option value="">-- Particular / Sin Asignar --</option>
                    ${optionsHtml}
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#0d9488',
            preConfirm: () => document.getElementById('swal-tipo-paciente').value
        });

        // 4. Guardar y Actualizar Estado Local
        if (nuevoTipoId !== undefined) {
            try {
                Swal.showLoading();
                const payload = { tipo_usuario: nuevoTipoId ? parseInt(nuevoTipoId) : null };
                
                // Actualizar BD
                const updatedPatient = await patientService.update(perfil.id, payload);
                
                // Actualizar Estado Local (Para que la tabla cambie sin recargar)
                setPatientsMap(prev => ({
                    ...prev,
                    [user.id]: {
                        ...prev[user.id],
                        tipo_usuario: updatedPatient.tipo_usuario,
                        // Simulamos el nombre si viene solo el ID, o usamos el objeto si viene completo
                        tipo_usuario_nombre: tiposPaciente.find(t => t.id == payload.tipo_usuario)?.nombre || 'Particular'
                    }
                }));

                Swal.fire('Actualizado', 'Clasificación modificada.', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo guardar.', 'error');
            }
        }
    };

    // --- MODAL AUTH ---
    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            nombre: user.nombre || '', email: user.email || '', 
            tipo_documento: user.tipo_documento || 'CC', documento: user.documento || '', numero: user.numero || ''
        });
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        try {
            await authService.adminUpdateUser(editingUser.id, formData);
            const updatedUsers = users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u);
            setUsers(updatedUsers);
            setIsModalOpen(false);
            Swal.fire('Guardado', 'Datos actualizados.', 'success');
        } catch (error) { Swal.fire('Error', 'Error guardando datos.', 'error'); }
    };

    // --- RENDER ---
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    return (
        <div className="max-w-7xl mx-auto p-4">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <FaUserShield className="text-blue-600"/> Gestión de Usuarios
                </h1>
                <div className="flex items-center gap-2">
                    <Link to="/dashboard/admin/pacientes" className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded">
                        <FaUsers /> Gestión de Pacientes
                    </Link>
                </div>
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Total: <b>{filteredUsers.length}</b>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-1/2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaSearch className="text-gray-400" /></div>
                    <input type="text" placeholder="Buscar usuario..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="w-full md:w-1/4">
                    <select className="w-full border rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                        <option value="todos">Todos los Roles</option>
                        {availableGroups.map(g => (<option key={g} value={g}>{g}</option>))}
                        <option value="sin_rol">Sin Roles</option>
                    </select>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                <th className="px-6 py-4">Información del Usuario</th>
                                <th className="px-6 py-4">Roles de Acceso</th>
                                <th className="px-6 py-4 text-center">Clasificación Médica</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400 animate-pulse">Cargando base de datos...</td></tr>
                            ) : currentUsers.map(u => (
                                <tr key={u.id} className="hover:bg-blue-50 transition duration-150 group">
                                    
                                    {/* 1. INFORMACIÓN ENRIQUECIDA */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                {u.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-gray-900 leading-none">{u.nombre}</span>
                                                
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                    <FaIdCard className="text-gray-400" />
                                                    <span className="font-mono bg-gray-100 px-1 rounded">{u.tipo_documento} {u.documento}</span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <FaEnvelope className="text-gray-400" />
                                                    <span className="truncate max-w-[150px]" title={u.email}>{u.email}</span>
                                                </div>

                                                {u.numero && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <FaPhone className="text-gray-400" />
                                                        <span>{u.numero}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* 2. ROLES */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2 cursor-pointer" onClick={() => handleEditGroups(u)}>
                                            {u.groups.length > 0 ? u.groups.map(g => (
                                                <span key={g} className={`px-2 py-1 rounded-md text-xs font-bold border ${
                                                    g.toLowerCase() === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    g.toLowerCase() === 'paciente' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                    {g}
                                                </span>
                                            )) : <span className="text-xs text-gray-400 italic border border-dashed border-gray-300 px-2 py-1 rounded">+ Asignar</span>}
                                        </div>
                                    </td>

                                    {/* 3. CLASIFICACIÓN VISIBLE */}
                                    <td className="px-6 py-4 text-center align-middle">
                                        {hasRole(u, 'paciente') ? (
                                            <div className="flex flex-col items-center gap-1">
                                                {/* Badge con el nombre real traído del mapa */}
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${
                                                    patientsMap[u.id]?.tipo_usuario_nombre 
                                                        ? 'bg-teal-100 text-teal-800 border-teal-200' 
                                                        : 'bg-gray-100 text-gray-500 border-gray-200'
                                                }`}>
                                                    {patientsMap[u.id]?.tipo_usuario_nombre || 'Particular / Sin Clasificar'}
                                                </span>

                                                {/* Botón discreto para editar */}
                                                <button 
                                                    onClick={() => handleEditTipoPaciente(u)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <FaPen size={10} /> Cambiar
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 text-xs">- N/A -</span>
                                        )}
                                    </td>

                                    {/* 4. ESTADO */}
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleToggleActive(u)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-all focus:outline-none ${u.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform shadow-sm ${u.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </td>

                                    {/* 5. ACCIONES */}
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-3">
                                            <button onClick={() => openEditModal(u)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Editar Info Básica">
                                                <FaEdit size={16} />
                                            </button>
                                            <button onClick={() => handleChangePassword(u)} className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors" title="Cambiar Contraseña">
                                                <FaKey size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN */}
                {filteredUsers.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Página {currentPage} de {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"><FaChevronLeft/></button>
                            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"><FaChevronRight/></button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL EDITAR AUTH */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={() => setIsModalOpen(false)}></div>
                        <div className="bg-white rounded-xl overflow-hidden shadow-2xl transform transition-all sm:max-w-lg w-full z-10">
                            <form onSubmit={handleModalSubmit}>
                                <div className="bg-white px-6 py-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><FaEdit /></div>
                                        Editar Datos de Acceso
                                    </h3>
                                    <div className="space-y-4">
                                        <div><label className="text-xs font-bold text-gray-500 uppercase">Nombre Completo</label><input required className="w-full border-gray-300 border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="col-span-1"><label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                                            <select className="w-full border-gray-300 border rounded-lg p-2.5" value={formData.tipo_documento} onChange={e => setFormData({...formData, tipo_documento: e.target.value})}>
                                                <option>CC</option><option>TI</option><option>CE</option><option>PAS</option>
                                            </select></div>
                                            <div className="col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Documento</label><input required className="w-full border-gray-300 border rounded-lg p-2.5" value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value})} /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input type="email" required className="w-full border-gray-300 border rounded-lg p-2.5" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                                            <div><label className="text-xs font-bold text-gray-500 uppercase">Teléfono</label><input className="w-full border-gray-300 border rounded-lg p-2.5" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} /></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t">
                                    <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-md transition-all">Guardar Cambios</button>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg font-medium hover:bg-gray-50 transition-all">Cancelar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsuarios;