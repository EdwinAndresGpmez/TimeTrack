import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import Swal from 'sweetalert2';
import { 
    FaEdit, FaKey, FaCheck, FaTimes, FaUserShield, 
    FaSearch, FaChevronLeft, FaChevronRight, FaFilter, FaPhone, FaIdCard 
} from 'react-icons/fa';

const AdminUsuarios = () => {
    // --- ESTADOS DE DATOS ---
    const [users, setUsers] = useState([]); 
    const [filteredUsers, setFilteredUsers] = useState([]); 
    const [availableGroups, setAvailableGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- ESTADOS DE PAGINACIÓN ---
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(10); 

    // --- ESTADOS DE FILTRO ---
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('todos');

    // --- ESTADOS DEL MODAL DE EDICIÓN ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    
    // Estado del formulario con TODOS los campos
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        tipo_documento: 'CC',
        documento: '',
        numero: '' // <--- Nuevo campo agregado
    });

    // 1. CARGA INICIAL
    useEffect(() => {
        cargarDatos();
    }, []);

    // 2. LÓGICA DE FILTRADO (Ahora busca también por teléfono)
    useEffect(() => {
        let result = users;

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(u => 
                u.nombre.toLowerCase().includes(lowerTerm) ||
                u.email.toLowerCase().includes(lowerTerm) ||
                u.documento.includes(lowerTerm) ||
                (u.numero && u.numero.includes(lowerTerm)) // Búsqueda por teléfono
            );
        }

        if (filterRole !== 'todos') {
            if (filterRole === 'sin_rol') {
                result = result.filter(u => u.groups.length === 0);
            } else {
                result = result.filter(u => u.groups.includes(filterRole));
            }
        }

        setFilteredUsers(result);
        setCurrentPage(1); 
    }, [users, searchTerm, filterRole]);

    // 3. PAGINACIÓN
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const data = await authService.getAllUsers();
            setUsers(data);
            setFilteredUsers(data); 
            const grupos = await authService.getGroups();
            setAvailableGroups(grupos);
        } catch (error) {
            console.error("Error cargando usuarios", error);
            Swal.fire('Error', 'Error de conexión', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- ACCIONES ---

    const handleToggleActive = async (user) => {
        try {
            await authService.adminUpdateUser(user.id, { is_active: !user.is_active });
            const updatedUsers = users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u);
            setUsers(updatedUsers);
            
            const estado = !user.is_active ? 'Activado' : 'Desactivado';
            Swal.fire({
                icon: 'success', title: estado, text: `Usuario ${estado.toLowerCase()}.`,
                timer: 1500, showConfirmButton: false
            });
        } catch (error) {
            Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
        }
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
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar', 'error');
            }
        }
    };

    const handleEditGroups = async (user) => {
        const groupsHtml = availableGroups.map(group => {
            const checked = user.groups.includes(group) ? 'checked' : '';
            return `<div style="text-align:left; margin-bottom:5px;"><input type="checkbox" id="chk-${group}" value="${group}" ${checked}> <label for="chk-${group}">${group}</label></div>`;
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

    // --- MODAL DE EDICIÓN ---

    const openEditModal = (user) => {
        setEditingUser(user);
        // Cargar todos los datos actuales del usuario al formulario
        setFormData({
            nombre: user.nombre || '',
            email: user.email || '',
            documento: user.documento || '',
            tipo_documento: user.tipo_documento || 'CC',
            numero: user.numero || '' // Cargar número actual
        });
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        try {
            // Enviamos todos los datos al backend
            await authService.adminUpdateUser(editingUser.id, formData);
            
            // Actualizamos la tabla localmente
            const updatedUsers = users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u);
            setUsers(updatedUsers);
            
            setIsModalOpen(false);
            Swal.fire('Guardado', 'Datos actualizados correctamente.', 'success');
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron guardar los cambios. Verifica duplicados.', 'error');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4">
            
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <FaUserShield className="text-blue-600"/> Administración de Usuarios
                </h1>
                <div className="text-sm text-gray-500">
                    Total: <b>{users.length}</b> | Filtrados: <b>{filteredUsers.length}</b>
                </div>
            </div>

            {/* FILTROS */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-1/2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, documento, email o teléfono..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-1/4 flex items-center gap-2">
                    <FaFilter className="text-gray-500" />
                    <select 
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                    >
                        <option value="todos">Todos los Roles</option>
                        {availableGroups.map(g => (
                            <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                        ))}
                        <option value="sin_rol">Sin Roles</option>
                    </select>
                </div>
            </div>

            {/* TABLA */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
                                <th className="px-5 py-3">Usuario</th>
                                <th className="px-5 py-3">Identificación</th>
                                <th className="px-5 py-3">Roles</th>
                                <th className="px-5 py-3 text-center">Estado</th>
                                <th className="px-5 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="px-5 py-10 text-center text-gray-500">Cargando...</td></tr>
                            ) : currentUsers.length === 0 ? (
                                <tr><td colSpan="5" className="px-5 py-10 text-center text-gray-500 italic">No hay resultados.</td></tr>
                            ) : (
                                currentUsers.map(u => (
                                    <tr key={u.id} className="border-b border-gray-200 hover:bg-blue-50 transition duration-150">
                                        <td className="px-5 py-4 text-sm">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 w-10 h-10">
                                                    <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                                        {u.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-gray-900 font-bold whitespace-no-wrap">{u.nombre}</p>
                                                    <p className="text-gray-500 text-xs">{u.email}</p>
                                                    {u.numero && (
                                                        <p className="text-gray-400 text-xs flex items-center gap-1">
                                                            <FaPhone size={10}/> {u.numero}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-500 font-bold">{u.tipo_documento}</span>
                                                <span className="font-mono bg-gray-100 px-2 py-1 rounded w-fit">{u.documento}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm">
                                            <div className="flex flex-wrap gap-1 cursor-pointer" onClick={() => handleEditGroups(u)}>
                                                {u.groups.length > 0 ? u.groups.map(g => (
                                                    <span key={g} className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                        g === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                        g === 'paciente' ? 'bg-green-100 text-green-800' :
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>{g}</span>
                                                )) : <span className="text-xs text-gray-400 border border-dashed border-gray-300 px-2 py-1 rounded hover:bg-gray-100">+ Rol</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button onClick={() => handleToggleActive(u)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${u.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${u.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex justify-center gap-3">
                                                <button onClick={() => openEditModal(u)} className="text-blue-600 hover:text-blue-900 tooltip" title="Editar Datos">
                                                    <FaEdit size={18} />
                                                </button>
                                                <button onClick={() => handleChangePassword(u)} className="text-yellow-500 hover:text-yellow-700 tooltip" title="Cambiar Contraseña">
                                                    <FaKey size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN */}
                {filteredUsers.length > 0 && (
                    <div className="px-5 py-4 bg-white border-t flex flex-col xs:flex-row items-center xs:justify-between">
                        <span className="text-xs xs:text-sm text-gray-900">
                            Mostrando {indexOfFirstUser + 1} - {Math.min(indexOfLastUser, filteredUsers.length)} de {filteredUsers.length}
                        </span>
                        <div className="inline-flex mt-2 xs:mt-0 gap-1">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded disabled:opacity-50">
                                <FaChevronLeft/>
                            </button>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded disabled:opacity-50">
                                <FaChevronRight/>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL DE EDICIÓN COMPLETO --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <form onSubmit={handleModalSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
                                        <FaEdit className="text-blue-500"/> Editar Información de Usuario
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {/* Nombre */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                                            <input type="text" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                                        </div>

                                        {/* Fila: Tipo Doc y Documento */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-1">
                                                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                                <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                                    value={formData.tipo_documento} onChange={e => setFormData({...formData, tipo_documento: e.target.value})}>
                                                    <option value="CC">CC</option>
                                                    <option value="TI">TI</option>
                                                    <option value="CE">CE</option>
                                                    <option value="PAS">PAS</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700">Número Documento</label>
                                                <div className="relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <FaIdCard className="text-gray-400" />
                                                    </div>
                                                    <input type="text" required className="pl-10 mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                                        value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fila: Email y Teléfono */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Teléfono / Celular</label>
                                                <div className="relative rounded-md shadow-sm mt-1">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <FaPhone className="text-gray-400" />
                                                    </div>
                                                    <input type="text" className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                                        value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} placeholder="Ej: 3001234567" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                                                <input type="email" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-red-500 mt-1">* Editar el documento o correo afectará el inicio de sesión del usuario.</p>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                                    <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:w-auto sm:text-sm">
                                        Guardar Cambios
                                    </button>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">
                                        Cancelar
                                    </button>
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