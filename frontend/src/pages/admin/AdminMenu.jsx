import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../../services/authService';
import Swal from 'sweetalert2';
import * as FaIcons from 'react-icons/fa';
import { 
    FaSave, FaBars, FaLock, FaPlus, FaTrash, FaCircle, 
    FaChevronDown, FaStethoscope, FaUserMd, FaHospital, FaCalendarAlt, FaBriefcaseMedical,
    FaLayerGroup
} from 'react-icons/fa';

// Lista de iconos para el selector
const ICON_OPTIONS = [
    'FaHome', 'FaUser', 'FaUserMd', 'FaUserInjured', 'FaCalendarAlt', 'FaCalendarCheck',
    'FaClipboardList', 'FaNotesMedical', 'FaHospital', 'FaStethoscope', 'FaCogs',
    'FaUsers', 'FaFileInvoiceDollar', 'FaChartBar', 'FaLock', 'FaShieldAlt',
    'FaBell', 'FaEnvelope', 'FaPhone', 'FaWalking', 'FaHistory', 'FaBriefcaseMedical',
    'FaFirstAid', 'FaMicroscope', 'FaVials', 'FaPills', 'FaFolderOpen', 'FaAddressCard'
];

const IconSelector = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const SelectedIcon = FaIcons[value] || FaIcons.FaCircle;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border border-gray-200 hover:border-indigo-400 transition-all"
            >
                <SelectedIcon className="text-indigo-600" />
                <FaChevronDown className="text-[10px] text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 p-3 bg-white border border-gray-200 rounded-2xl shadow-2xl grid grid-cols-5 gap-2 w-56 animate-fadeIn max-h-60 overflow-y-auto">
                    {ICON_OPTIONS.map(iconName => {
                        const Icon = FaIcons[iconName] || FaIcons.FaCircle;
                        return (
                            <button
                                key={`icon-opt-${iconName}`}
                                type="button"
                                onClick={() => { onChange(iconName); setIsOpen(false); }}
                                className={`p-2 rounded-lg hover:bg-indigo-50 transition-colors ${value === iconName ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}
                            >
                                <Icon size={18} />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const AdminMenu = () => {
    const [menus, setMenus] = useState([]);
    const [permisos, setPermisos] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConfigData();
    }, []);

    const loadConfigData = async () => {
        setLoading(true);
        try {
            const [dataMenus, dataPermisos, dataGroups] = await Promise.all([
                authService.getMenuItemsAdmin(),
                authService.getPermisosVistaAdmin(),
                authService.getGroups()
            ]);
            
            const normalizedGroups = (dataGroups || []).map((g, idx) => {
                if (typeof g === 'string') return { id: g, name: g };
                return { id: g.id || g.pk || g.name || `group-${idx}`, name: g.name || g.nombre || String(g) };
            });

            const normalizeItems = (items) => items.map(item => ({
                ...item,
                roles: (item.roles || []).map(r => (typeof r === 'object' ? r.id : r))
            }));

            setGroups(normalizedGroups);
            setMenus(normalizeItems(dataMenus || []));
            setPermisos(normalizeItems(dataPermisos || []));
        } catch (error) {
            console.error("Error cargando configuración:", error);
        } finally {
            setLoading(false);
        }
    };

    const isRoleSelected = (itemRoles, groupId) => {
        if (!itemRoles || !groupId) return false;
        return itemRoles.some(rId => Number(rId) === Number(groupId));
    };

    const toggleRole = (item, groupId, type) => {
        const currentRoles = [...(item.roles || [])];
        const gId = Number(groupId);
        const index = currentRoles.findIndex(rId => Number(rId) === gId);
        
        if (index > -1) currentRoles.splice(index, 1);
        else currentRoles.push(gId);

        if (type === 'menu') {
            setMenus(menus.map(m => m.id === item.id ? { ...m, roles: currentRoles } : m));
        } else {
            setPermisos(permisos.map(p => p.id === item.id ? { ...p, roles: currentRoles } : p));
        }
    };

    const handleCreateItem = async (e, type) => {
        e.preventDefault();
        e.stopPropagation();

        const isMenu = type === 'menu';
        const { value: formValues } = await Swal.fire({
            title: isMenu ? 'Nuevo Ítem de Menú' : 'Nuevo Permiso (App.jsx)',
            html: isMenu ? 
                `<input id="swal-label" class="swal2-input" placeholder="Etiqueta (Ej: Mi Agenda)">` +
                `<input id="swal-url" class="swal2-input" placeholder="URL (Ej: /dashboard/mi-agenda)">` +
                `<input id="swal-cat" class="swal2-input" placeholder="Categoría (Ej: GESTIÓN)">` :
                `<input id="swal-code" class="swal2-input" placeholder="Codename (Ej: acceso_agenda)">`,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            preConfirm: () => {
                const label = isMenu ? document.getElementById('swal-label').value : null;
                const url = isMenu ? document.getElementById('swal-url').value : null;
                const category = isMenu ? document.getElementById('swal-cat').value.toUpperCase() : null;
                const codename = !isMenu ? document.getElementById('swal-code').value : null;

                if (isMenu && (!label || !url)) return Swal.showValidationMessage('Faltan campos');
                if (!isMenu && !codename) return Swal.showValidationMessage('El Codename es obligatorio');

                return isMenu ? { label, url, category_name: category, icon: 'FaCircle', order: menus.length + 1, roles: [] } 
                              : { codename, roles: [] };
            }
        });

        if (formValues) {
            try {
                if (isMenu) await authService.createMenuItem(formValues);
                else await authService.createPermisoVista(formValues);
                await loadConfigData();
                Swal.fire('¡Éxito!', 'Creado correctamente', 'success');
            } catch (err) {
                Swal.fire('Error', 'No se pudo crear el registro.', 'error');
            }
        }
    };

    const handleDelete = async (e, id, type) => {
        e.preventDefault();
        e.stopPropagation();

        const result = await Swal.fire({
            title: '¿Eliminar?',
            text: "Esta acción borrará el registro de la base de datos.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar'
        });

        if (result.isConfirmed) {
            try {
                if (type === 'menu') await authService.deleteMenuItem(id);
                else await authService.deletePermisoVista(id);
                await loadConfigData();
                Swal.fire('Eliminado', 'El ítem ha sido borrado.', 'success');
            } catch (err) {
                Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
            }
        }
    };

    const handleSaveItem = async (e, item, type) => {
        e.preventDefault();
        try {
            if (type === 'menu') await authService.updateMenuItemAdmin(item.id, item);
            else await authService.updatePermisoVistaAdmin(item.id, item);
            Swal.fire({ icon: 'success', title: 'Cambios guardados', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } catch (err) {
            Swal.fire('Error', 'Error al actualizar', 'error');
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse uppercase font-black text-gray-400">Cargando módulos de navegación...</div>;

    return (
        <div className="space-y-12 animate-fadeIn">
            {/* SECCIÓN MENÚ LATERAL */}
            <section className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><FaBars size={20} /></div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Arquitectura del Sidebar</h2>
                    </div>
                    <button type="button" onClick={(e) => handleCreateItem(e, 'menu')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95">
                        <FaPlus size={14} /> Nuevo Ítem
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-4">Orden</th>
                                <th className="px-4 text-center">Icono</th>
                                <th className="px-4">Etiqueta</th>
                                <th className="px-4">Ruta (Path)</th>
                                <th className="px-4">Categoría / Agrupador</th>
                                <th className="px-4">Acceso Roles</th>
                                <th className="px-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {menus.map((menu) => (
                                <tr key={`menu-${menu.id}`} className="bg-gray-50/50 hover:bg-white transition-all group rounded-2xl shadow-sm hover:shadow-md border border-transparent hover:border-indigo-100">
                                    <td className="px-4 py-4 first:rounded-l-2xl">
                                        <input 
                                            type="number" 
                                            value={menu.order} 
                                            onChange={(e) => setMenus(menus.map(m => m.id === menu.id ? {...m, order: e.target.value} : m))}
                                            className="w-12 bg-white border border-gray-200 rounded-xl text-center font-bold text-indigo-600 p-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <IconSelector value={menu.icon} onChange={(newIcon) => setMenus(menus.map(m => m.id === menu.id ? {...m, icon: newIcon} : m))} />
                                    </td>
                                    <td className="px-4 py-4">
                                        <input 
                                            type="text" 
                                            value={menu.label} 
                                            onChange={(e) => setMenus(menus.map(m => m.id === menu.id ? {...m, label: e.target.value} : m))}
                                            className="bg-transparent border-none font-bold text-gray-700 focus:ring-0 w-full"
                                            placeholder="Nombre del ítem"
                                        />
                                    </td>
                                    <td className="px-4 py-4">
                                        <input 
                                            type="text" 
                                            value={menu.url} 
                                            onChange={(e) => setMenus(menus.map(m => m.id === menu.id ? {...m, url: e.target.value} : m))}
                                            className="bg-white border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-mono text-indigo-500 w-full outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                    </td>
                                    {/* CAMPO DE CATEGORÍA AGREGADO */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <FaLayerGroup className="text-emerald-400 text-xs shrink-0" />
                                            <input 
                                                type="text" 
                                                placeholder="SIN CATEGORÍA"
                                                value={menu.category_name || ''} 
                                                onChange={(e) => setMenus(menus.map(m => m.id === menu.id ? {...m, category_name: e.target.value.toUpperCase()} : m))} 
                                                className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border-none w-full placeholder:text-emerald-200 focus:ring-2 focus:ring-emerald-400 outline-none uppercase" 
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {groups.map(g => (
                                                <button 
                                                    key={`m-g-${menu.id}-${g.id}`} 
                                                    type="button" 
                                                    onClick={() => toggleRole(menu, g.id, 'menu')}
                                                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black border transition-all ${isRoleSelected(menu.roles, g.id) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-gray-300 border-gray-100 hover:border-indigo-200 hover:text-indigo-400'}`}>
                                                    {g.name}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 last:rounded-r-2xl">
                                        <div className="flex justify-center gap-2">
                                            <button type="button" onClick={(e) => handleSaveItem(e, menu, 'menu')} className="p-2.5 bg-green-500 text-white rounded-xl shadow-lg shadow-green-100 hover:bg-green-600 active:scale-90 transition-all" title="Guardar"><FaSave size={14}/></button>
                                            <button type="button" onClick={(e) => handleDelete(e, menu.id, 'menu')} className="p-2.5 bg-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90" title="Eliminar"><FaTrash size={14}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* SECCIÓN PERMISOS */}
            <section className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-600 text-white rounded-xl shadow-lg shadow-red-100"><FaLock size={20} /></div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Reglas de Seguridad (App.jsx)</h2>
                    </div>
                    <button type="button" onClick={(e) => handleCreateItem(e, 'permiso')} className="bg-gray-800 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
                        <FaPlus size={14} /> Nuevo Permiso
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {permisos.map(p => (
                        <div key={`perm-${p.id}`} className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 border-t-4 border-t-red-500 relative group transition-all hover:shadow-xl hover:bg-white hover:border-red-100">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1">Codename Interno</span>
                                    <input 
                                        type="text" 
                                        value={p.codename} 
                                        onChange={(e) => setPermisos(permisos.map(perm => perm.id === p.id ? {...perm, codename: e.target.value} : perm))}
                                        className="bg-transparent border-none p-0 font-mono font-bold text-gray-700 focus:ring-0 w-full"
                                        placeholder="ej: config_sistema"
                                    />
                                </div>
                                <div className="flex gap-1">
                                    <button type="button" onClick={(e) => handleSaveItem(e, p, 'permiso')} className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors" title="Guardar"><FaSave size={16}/></button>
                                    <button type="button" onClick={(e) => handleDelete(e, p.id, 'permiso')} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar"><FaTrash size={16}/></button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-4 border-t border-gray-200/50">
                                {groups.map(g => (
                                    <button 
                                        key={`p-g-${p.id}-${g.id}`} 
                                        type="button" 
                                        onClick={() => toggleRole(p, g.id, 'permiso')}
                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black border transition-all ${isRoleSelected(p.roles, g.id) ? 'bg-red-500 text-white border-red-600 shadow-sm' : 'bg-white text-gray-400 border-gray-100 hover:border-red-200 hover:text-red-400'}`}>
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default AdminMenu;