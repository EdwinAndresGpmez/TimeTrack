import React, { useEffect, useState } from 'react';
import { staffService } from '../../services/staffService';
import Swal from 'sweetalert2';
import { 
    FaHospital, FaStethoscope, FaNotesMedical, FaPlus, FaEdit, 
    FaTrash, FaCheck, FaToggleOn, FaToggleOff 
} from 'react-icons/fa';

const AdminParametricas = () => {
    const [activeTab, setActiveTab] = useState('sedes'); // sedes | especialidades | servicios
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estado para el Modal Genérico
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        cargarDatos();
    }, [activeTab]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            let data = [];
            if (activeTab === 'sedes') data = await staffService.getLugares();
            if (activeTab === 'especialidades') data = await staffService.getEspecialidades();
            if (activeTab === 'servicios') data = await staffService.getServicios();
            
            // ORDENAR: Mostrar primero los activos, luego los inactivos
            data.sort((a, b) => Number(b.activo) - Number(a.activo));
            
            setDataList(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- MANEJO DEL MODAL ---
    const openModal = (item = null) => {
        setIsEditing(!!item);
        setCurrentId(item ? item.id : null);
        
        // Inicializar formulario según la pestaña
        if (activeTab === 'sedes') {
            setFormData(item || { nombre: '', direccion: '', ciudad: '', activo: true });
        } else if (activeTab === 'especialidades') {
            // AHORA INCLUYE 'activo' POR DEFECTO
            setFormData(item || { nombre: '', descripcion: '', activo: true });
        } else if (activeTab === 'servicios') {
            setFormData(item || { nombre: '', descripcion: '', duracion_minutos: 30, precio_base: 0, activo: true });
        }
        setIsModalOpen(true);
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (activeTab === 'sedes') {
                isEditing ? await staffService.updateLugar(currentId, formData) : await staffService.createLugar(formData);
            } else if (activeTab === 'especialidades') {
                isEditing ? await staffService.updateEspecialidad(currentId, formData) : await staffService.createEspecialidad(formData);
            } else if (activeTab === 'servicios') {
                isEditing ? await staffService.updateServicio(currentId, formData) : await staffService.createServicio(formData);
            }
            Swal.fire('Guardado', 'Registro actualizado correctamente', 'success');
            setIsModalOpen(false);
            cargarDatos();
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar el registro', 'error');
        }
    };

    // --- LÓGICA DE BORRADO SEGURO (HARD DELETE) ---
    const handleDelete = async (item) => {
        const result = await Swal.fire({
            title: `¿Eliminar "${item.nombre}"?`,
            html: `<p class="text-sm">Si este registro ya tiene datos asociados (médicos o citas), <b>no se podrá eliminar</b> por seguridad.</p>
                   <p class="text-xs text-gray-500 mt-2">En ese caso, usa el botón de estado para desactivarlo.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, intentar borrar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                if (activeTab === 'sedes') await staffService.deleteLugar(item.id);
                if (activeTab === 'especialidades') await staffService.deleteEspecialidad(item.id);
                if (activeTab === 'servicios') await staffService.deleteServicio(item.id);
                
                Swal.fire('Eliminado', 'Registro borrado permanentemente.', 'success');
                cargarDatos();
            } catch (error) {
                // Si el backend devuelve error (por Foreign Key protection)
                Swal.fire({
                    title: 'No se puede eliminar',
                    text: 'Este ítem está en uso. Debes DESACTIVARLO en lugar de borrarlo.',
                    icon: 'error'
                });
            }
        }
    };

    // --- LÓGICA DE ACTIVAR/DESACTIVAR (SOFT DELETE) ---
    const handleToggle = async (item) => {
        try {
            const newState = !item.activo;
            const payload = { ...item, activo: newState };
            
            // Reutilizamos los endpoints de update existentes
            if (activeTab === 'sedes') await staffService.updateLugar(item.id, payload);
            if (activeTab === 'especialidades') await staffService.updateEspecialidad(item.id, payload);
            if (activeTab === 'servicios') await staffService.updateServicio(item.id, payload);

            const msg = newState ? 'Activado' : 'Desactivado';
            
            // Alerta pequeña tipo "Toast"
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            Toast.fire({ icon: 'success', title: `Registro ${msg}` });
            
            cargarDatos();
        } catch (error) {
            Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaCheck className="text-green-600"/> Paramétricas del Sistema
            </h1>

            {/* TABS HEADER */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('sedes')} className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'sedes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}>
                    <FaHospital /> Sedes / Lugares
                </button>
                <button onClick={() => setActiveTab('especialidades')} className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'especialidades' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}>
                    <FaStethoscope /> Especialidades
                </button>
                <button onClick={() => setActiveTab('servicios')} className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'servicios' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}>
                    <FaNotesMedical /> Servicios
                </button>
            </div>

            {/* ACTION BAR */}
            <div className="flex justify-end mb-4">
                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 font-bold transition">
                    <FaPlus /> Agregar {activeTab === 'sedes' ? 'Sede' : activeTab === 'especialidades' ? 'Especialidad' : 'Servicio'}
                </button>
            </div>

            {/* TABLE CONTENT */}
            <div className="bg-white rounded shadow overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Detalles</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="4" className="text-center p-10 text-gray-500">Cargando datos...</td></tr> : dataList.map((item) => (
                                <tr key={item.id} className={`hover:bg-gray-50 border-b border-gray-200 transition ${!item.activo ? 'bg-gray-100 opacity-75' : ''}`}>
                                    <td className="px-5 py-4 text-sm font-bold text-gray-900">
                                        {item.nombre}
                                        {!item.activo && <span className="ml-2 px-2 py-0.5 rounded text-xs bg-red-100 text-red-600 font-normal">Inactivo</span>}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-600">
                                        {activeTab === 'sedes' && `${item.ciudad} - ${item.direccion}`}
                                        {activeTab === 'especialidades' && (item.descripcion || 'Sin descripción')}
                                        {activeTab === 'servicios' && `${item.duracion_minutos} min - $${item.precio_base}`}
                                    </td>
                                    
                                    {/* COLUMNA TOGGLE (ESTADO) */}
                                    <td className="px-5 py-4 text-center">
                                        <button 
                                            onClick={() => handleToggle(item)}
                                            className="text-2xl focus:outline-none transition-transform active:scale-95"
                                            title={item.activo ? "Desactivar (Archivar)" : "Activar"}
                                        >
                                            {item.activo 
                                                ? <FaToggleOn className="text-green-500 hover:text-green-600" />
                                                : <FaToggleOff className="text-gray-400 hover:text-gray-600" />
                                            }
                                        </button>
                                    </td>

                                    {/* ACCIONES */}
                                    <td className="px-5 py-4 text-right text-sm">
                                        <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-900 mr-3 p-1" title="Editar">
                                            <FaEdit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(item)} className="text-red-400 hover:text-red-600 p-1" title="Eliminar Definitivamente">
                                            <FaTrash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && dataList.length === 0 && (
                                <tr><td colSpan="4" className="text-center p-10 text-gray-400 italic">No hay registros creados aún.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                        <div className="bg-blue-600 px-4 py-3 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                {isEditing ? <FaEdit/> : <FaPlus/>} 
                                {isEditing ? 'Editar' : 'Crear'} Registro
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-2xl hover:text-gray-200">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">Nombre</label>
                                <input name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            {activeTab === 'sedes' && (
                                <>
                                    <div><label className="block text-sm font-bold mb-1 text-gray-700">Ciudad</label><input name="ciudad" value={formData.ciudad} onChange={handleChange} required className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500" /></div>
                                    <div><label className="block text-sm font-bold mb-1 text-gray-700">Dirección</label><input name="direccion" value={formData.direccion} onChange={handleChange} required className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500" /></div>
                                    <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                                        <input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} id="chk_activo" className="h-4 w-4 text-blue-600" /> 
                                        <label htmlFor="chk_activo" className="text-sm font-medium text-gray-700">Sede Activa</label>
                                    </div>
                                </>
                            )}

                            {activeTab === 'especialidades' && (
                                <>
                                    <div><label className="block text-sm font-bold mb-1 text-gray-700">Descripción</label><textarea name="descripcion" value={formData.descripcion} onChange={handleChange} className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500" rows="3"></textarea></div>
                                    
                                    {/* AÑADIDO CHECKBOX PARA ESPECIALIDADES */}
                                    <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                                        <input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} id="chk_esp_activo" className="h-4 w-4 text-blue-600" /> 
                                        <label htmlFor="chk_esp_activo" className="text-sm font-medium text-gray-700">Especialidad Activa</label>
                                    </div>
                                </>
                            )}

                            {activeTab === 'servicios' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-bold mb-1 text-gray-700">Duración (min)</label><input type="number" name="duracion_minutos" value={formData.duracion_minutos} onChange={handleChange} required className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500" /></div>
                                        <div><label className="block text-sm font-bold mb-1 text-gray-700">Precio Base</label><input type="number" name="precio_base" value={formData.precio_base} onChange={handleChange} required className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500" /></div>
                                    </div>
                                    <div><label className="block text-sm font-bold mb-1 text-gray-700">Descripción</label><textarea name="descripcion" value={formData.descripcion} onChange={handleChange} className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500" rows="2"></textarea></div>
                                    <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded border border-gray-100">
                                        <input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} id="chk_serv_activo" className="h-4 w-4 text-blue-600" /> 
                                        <label htmlFor="chk_serv_activo" className="text-sm font-medium text-gray-700">Servicio Habilitado</label>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-bold transition">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow transition">
                                    {isEditing ? 'Guardar Cambios' : 'Crear Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminParametricas;