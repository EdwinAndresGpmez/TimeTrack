import React, { useEffect, useState } from 'react';
import { staffService } from '../../services/staffService';
import { patientService } from '../../services/patientService'; // Servicio para traer los tipos reales
import Swal from 'sweetalert2';
import { 
    FaHospital, FaStethoscope, FaNotesMedical, FaPlus, FaEdit, 
    FaTrash, FaCheck, FaToggleOn, FaToggleOff, FaUsers 
} from 'react-icons/fa';

const AdminParametricas = () => {
    // Tabs: sedes | especialidades | servicios
    const [activeTab, setActiveTab] = useState('sedes'); 
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estado para catálogo auxiliar (Tipos de Paciente desde MS Patients)
    const [tiposPacienteOptions, setTiposPacienteOptions] = useState([]);

    // Estado para el Modal Genérico
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({});

    // Cargar datos principales al cambiar de tab
    useEffect(() => {
        cargarDatos();
        
        // Si entramos a servicios, cargamos también el catálogo de tipos de paciente
        if (activeTab === 'servicios') {
            cargarTiposExternos();
        }
    }, [activeTab]);

    const cargarTiposExternos = async () => {
        try {
            // Trae todos los tipos (EPS, Particular, etc.)
            const tipos = await patientService.getTiposPaciente();
            // Filtramos solo los activos para no asignar tipos viejos
            if (Array.isArray(tipos)) {
                setTiposPacienteOptions(tipos.filter(t => t.activo));
            }
        } catch (e) {
            console.error("Error cargando tipos de pacientes", e);
        }
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            let data = [];
            if (activeTab === 'sedes') data = await staffService.getLugares();
            if (activeTab === 'especialidades') data = await staffService.getEspecialidades();
            if (activeTab === 'servicios') data = await staffService.getServicios();
            
            // ORDENAR: Activos primero
            data.sort((a, b) => Number(b.activo) - Number(a.activo));
            setDataList(data);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
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
            setFormData(item || { nombre: '', descripcion: '', activo: true });
        } else if (activeTab === 'servicios') {
            // Para servicios, inicializamos tipos_paciente_ids como array vacío si es nuevo
            setFormData(item || { 
                nombre: '', 
                descripcion: '', 
                duracion_minutos: 30, 
                precio_base: 0, 
                tipos_paciente_ids: [], // Array de IDs [1, 2, ...]
                activo: true,
                profesionales: [] 
            });
        }
        setIsModalOpen(true);
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    // Handler especial para checkboxes múltiples (Tipos de Acceso)
    const handleTiposChange = (idTipo) => {
        const currentIds = formData.tipos_paciente_ids || [];
        if (currentIds.includes(idTipo)) {
            // Quitar ID
            setFormData({ 
                ...formData, 
                tipos_paciente_ids: currentIds.filter(id => id !== idTipo) 
            });
        } else {
            // Agregar ID
            setFormData({ 
                ...formData, 
                tipos_paciente_ids: [...currentIds, idTipo] 
            });
        }
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
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar el registro', 'error');
        }
    };

    // --- LÓGICA DE BORRADO Y ESTADO ---
    const handleDelete = async (item) => { /* ... Código igual al original ... */ };
    const handleToggle = async (item) => {
        try {
            const newState = !item.activo;
            const payload = { ...item, activo: newState };
            
            if (activeTab === 'sedes') await staffService.updateLugar(item.id, payload);
            if (activeTab === 'especialidades') await staffService.updateEspecialidad(item.id, payload);
            if (activeTab === 'servicios') await staffService.updateServicio(item.id, payload);

            const msg = newState ? 'Activado' : 'Desactivado';
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            Toast.fire({ icon: 'success', title: `Registro ${msg}` });
            cargarDatos();
        } catch (error) {
            Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
        }
    };

    // Helper para mostrar nombres de tipos en la tabla (cruce de IDs con Nombres)
    const getNombresTipos = (idsArray) => {
        if (!idsArray || idsArray.length === 0) return null;
        // Mapeamos los IDs guardados con los nombres del catálogo cargado
        return idsArray.map(id => {
            const tipo = tiposPacienteOptions.find(t => t.id === id);
            return tipo ? tipo.nombre : `ID: ${id}`;
        });
    };

    return (
        <div className="max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaCheck className="text-green-600"/> Paramétricas del Sistema
            </h1>

            {/* TABS */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('sedes')} className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'sedes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}>
                    <FaHospital /> Sedes
                </button>
                <button onClick={() => setActiveTab('especialidades')} className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'especialidades' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}>
                    <FaStethoscope /> Especialidades
                </button>
                <button onClick={() => setActiveTab('servicios')} className={`px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'servicios' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-blue-500'}`}>
                    <FaNotesMedical /> Servicios
                </button>
            </div>

            <div className="flex justify-end mb-4">
                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 font-bold transition">
                    <FaPlus /> Agregar Registro
                </button>
            </div>

            {/* TABLA */}
            <div className="bg-white rounded shadow overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold text-gray-600 uppercase">Detalles</th>
                                <th className="px-5 py-3 border-b-2 text-center text-xs font-semibold text-gray-600 uppercase">Estado</th>
                                <th className="px-5 py-3 border-b-2 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="4" className="text-center p-10 text-gray-500">Cargando...</td></tr> : dataList.map((item) => (
                                <tr key={item.id} className={`hover:bg-gray-50 border-b border-gray-200 transition ${!item.activo ? 'bg-gray-100 opacity-75' : ''}`}>
                                    <td className="px-5 py-4 text-sm font-bold text-gray-900">
                                        {item.nombre}
                                        {!item.activo && <span className="ml-2 px-2 py-0.5 rounded text-xs bg-red-100 text-red-600 font-normal">Inactivo</span>}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-600">
                                        {activeTab === 'sedes' && `${item.ciudad} - ${item.direccion}`}
                                        {activeTab === 'especialidades' && (item.descripcion || '-')}
                                        {activeTab === 'servicios' && (
                                            <div>
                                                <div className="font-mono text-xs mb-1">{item.duracion_minutos} min | ${item.precio_base}</div>
                                                
                                                {/* RENDERING DE TIPOS DE ACCESO (BADGES) */}
                                                <div className="flex flex-wrap gap-1">
                                                    {(!item.tipos_paciente_ids || item.tipos_paciente_ids.length === 0) ? (
                                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200 flex items-center gap-1">
                                                            <FaUsers size={8}/> Todos
                                                        </span>
                                                    ) : (
                                                        // Usamos el helper para mostrar nombres en lugar de IDs
                                                        getNombresTipos(item.tipos_paciente_ids)?.map((nombre, idx) => (
                                                            <span key={idx} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                                                                {nombre}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button onClick={() => handleToggle(item)} className="text-2xl focus:outline-none">
                                            {item.activo ? <FaToggleOn className="text-green-500"/> : <FaToggleOff className="text-gray-400"/>}
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button onClick={() => openModal(item)} className="text-blue-600 mr-3"><FaEdit size={18}/></button>
                                        {/* <button onClick={() => handleDelete(item)} className="text-red-400"><FaTrash size={16}/></button> */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-blue-600 px-4 py-3 flex justify-between text-white font-bold">
                            <h3>{isEditing ? 'Editar' : 'Crear'} {activeTab}</h3>
                            <button onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Nombre</label>
                                <input name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"/>
                            </div>

                            {activeTab === 'servicios' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold mb-1">Duración (min)</label>
                                            <input type="number" name="duracion_minutos" value={formData.duracion_minutos} onChange={handleChange} className="w-full border p-2 rounded"/>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold mb-1">Precio Base</label>
                                            <input type="number" name="precio_base" value={formData.precio_base} onChange={handleChange} className="w-full border p-2 rounded"/>
                                        </div>
                                    </div>

                                    {/* SELECTOR MÚLTIPLE DE TIPOS DE PACIENTE */}
                                    <div className="border p-3 rounded bg-gray-50">
                                        <label className="block text-sm font-bold mb-2 text-gray-700 flex items-center gap-2">
                                            <FaUsers className="text-blue-500"/> Disponible para:
                                        </label>
                                        <div className="max-h-32 overflow-y-auto grid grid-cols-1 gap-1">
                                            {tiposPacienteOptions.map(tipo => (
                                                <label key={tipo.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-200 p-1 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={formData.tipos_paciente_ids?.includes(tipo.id)}
                                                        onChange={() => handleTiposChange(tipo.id)}
                                                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm">{tipo.nombre}</span>
                                                </label>
                                            ))}
                                            {tiposPacienteOptions.length === 0 && <span className="text-xs text-red-500 italic">No hay tipos definidos.</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 border-t pt-1">
                                            {(!formData.tipos_paciente_ids || formData.tipos_paciente_ids.length === 0) 
                                                ? "ℹ️ Si no seleccionas ninguno, será visible para TODOS." 
                                                : `✅ Visible solo para ${formData.tipos_paciente_ids.length} tipos seleccionados.`}
                                        </p>
                                    </div>
                                </>
                            )}
                            
                            {/* Campos comunes sedes/especialidades... */}
                            {activeTab === 'sedes' && (
                                <>
                                    <div><label className="block text-sm font-bold mb-1">Ciudad</label><input name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full border p-2 rounded"/></div>
                                    <div><label className="block text-sm font-bold mb-1">Dirección</label><input name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border p-2 rounded"/></div>
                                </>
                            )}
                            {activeTab === 'especialidades' && (
                                <div><label className="block text-sm font-bold mb-1">Descripción</label><textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="2" className="w-full border p-2 rounded"></textarea></div>
                            )}

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow font-bold">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminParametricas;