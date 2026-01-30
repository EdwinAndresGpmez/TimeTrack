import React, { useEffect, useState } from 'react';
import { staffService } from '../../services/staffService';
import Swal from 'sweetalert2';
import { 
    FaUserMd, FaPlus, FaEdit, FaSearch, FaMapMarkerAlt, 
    FaStethoscope, FaToggleOn, FaToggleOff, FaIdCard, FaNotesMedical 
} from 'react-icons/fa';

const AdminProfesionales = () => {
    // --- ESTADOS ---
    const [profesionales, setProfesionales] = useState([]);
    const [filteredProfesionales, setFilteredProfesionales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Catálogos
    const [especialidades, setEspecialidades] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [servicios, setServicios] = useState([]); 

    // Modal y Formulario
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        numero_documento: '',
        registro_medico: '',
        email_profesional: '',
        telefono_profesional: '',
        especialidades: [],      
        lugares_atencion: [],    
        servicios_habilitados: [],
        activo: true
    });

    // --- CARGA DE DATOS ---
    useEffect(() => {
        cargarDatos();
    }, []);

    // Filtro en tiempo real
    useEffect(() => {
        if (!searchTerm) {
            setFilteredProfesionales(profesionales);
        } else {
            const lower = searchTerm.toLowerCase();
            const filtered = profesionales.filter(p => 
                p.nombre.toLowerCase().includes(lower) ||
                p.numero_documento.includes(lower) ||
                p.registro_medico.toLowerCase().includes(lower)
            );
            setFilteredProfesionales(filtered);
        }
    }, [searchTerm, profesionales]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [dataProf, dataEsp, dataLug, dataServ] = await Promise.all([
                staffService.getProfesionales(),
                staffService.getEspecialidades(),
                staffService.getLugares(),
                staffService.getServicios()
            ]);
            setProfesionales(dataProf);
            setFilteredProfesionales(dataProf);
            setEspecialidades(dataEsp);
            setLugares(dataLug);
            setServicios(dataServ);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar la información del staff.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- MANEJO DE FORMULARIO ---
    
    const openModal = (profesional = null) => {
        if (profesional) {
            setIsEditing(true);
            setCurrentId(profesional.id);
            // Aseguramos que las listas sean arrays para evitar errores en map/includes
            setFormData({
                nombre: profesional.nombre,
                numero_documento: profesional.numero_documento,
                registro_medico: profesional.registro_medico,
                email_profesional: profesional.email_profesional,
                telefono_profesional: profesional.telefono_profesional,
                especialidades: profesional.especialidades || [],
                lugares_atencion: profesional.lugares_atencion || [],
                servicios_habilitados: profesional.servicios_habilitados || [],
                activo: profesional.activo
            });
        } else {
            setIsEditing(false);
            setCurrentId(null);
            setFormData({
                nombre: '', numero_documento: '', registro_medico: '',
                email_profesional: '', telefono_profesional: '',
                especialidades: [], lugares_atencion: [], servicios_habilitados: [], 
                activo: true
            });
        }
        setIsModalOpen(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- NUEVA LÓGICA DE CHECKBOXES (Reemplaza al select multiple) ---
    const handleCheckboxChange = (e, listName) => {
        const value = parseInt(e.target.value);
        const isChecked = e.target.checked;
        
        setFormData(prev => {
            const currentList = prev[listName] || [];
            if (isChecked) {
                // Agregar si no existe
                return { ...prev, [listName]: [...currentList, value] };
            } else {
                // Filtrar para remover
                return { ...prev, [listName]: currentList.filter(id => id !== value) };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await staffService.updateProfesional(currentId, formData);
                Swal.fire('Actualizado', 'Datos del profesional guardados.', 'success');
            } else {
                await staffService.createProfesional(formData);
                Swal.fire('Creado', 'Nuevo profesional registrado.', 'success');
            }
            setIsModalOpen(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.numero_documento 
                ? 'El número de documento ya existe.' 
                : 'Error al guardar. Verifique los datos.';
            Swal.fire('Error', msg, 'error');
        }
    };

    const handleToggleStatus = async (prof) => {
        try {
            await staffService.toggleActivo(prof.id, prof.activo);
            setProfesionales(prev => prev.map(p => p.id === prof.id ? { ...p, activo: !p.activo } : p));
            const texto = !prof.activo ? 'Activado' : 'Desactivado';
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            Toast.fire({ icon: 'success', title: `Profesional ${texto}` });
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cambiar el estado.', 'error');
            cargarDatos();
        }
    };

    // Helper visual para la tabla
    const getNombresByIds = (ids, catalogo) => {
        if (!ids || ids.length === 0) return <span className="text-gray-400 italic text-xs">Sin asignar</span>;
        return ids.map(id => {
            const item = catalogo.find(c => c.id === id);
            return item ? (
                <span key={id} className="inline-block bg-blue-50 text-blue-700 text-[10px] px-2 py-1 rounded-full mr-1 mb-1 border border-blue-100">
                    {item.nombre}
                </span>
            ) : null;
        });
    };

    // Componente interno reutilizable para listas de checkboxes
    const RenderCheckboxList = ({ items, listName, selectedIds, label, icon }) => (
        <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2 text-sm flex items-center gap-2">
                {icon} {label}
            </label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-inner">
                {items.map(item => (
                    <div key={item.id} className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-200 hover:bg-blue-50 transition cursor-pointer">
                        <input
                            type="checkbox"
                            id={`${listName}-${item.id}`}
                            value={item.id}
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => handleCheckboxChange(e, listName)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                        />
                        <label htmlFor={`${listName}-${item.id}`} className="text-xs text-gray-700 cursor-pointer flex-1 select-none font-medium">
                            {item.nombre} {item.ciudad ? `(${item.ciudad})` : ''}
                        </label>
                    </div>
                ))}
                {items.length === 0 && <div className="text-xs text-gray-400 italic col-span-2 text-center p-2">No hay opciones disponibles</div>}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-4">
            
            {/* CABECERA */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <FaUserMd className="text-blue-600"/> Gestión de Profesionales
                </h1>
                <button 
                    onClick={() => openModal()}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition transform hover:scale-105"
                >
                    <FaPlus /> Nuevo Profesional
                </button>
            </div>

            {/* FILTRO */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 relative">
                <FaSearch className="absolute left-7 top-7 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, documento o registro médico..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b">
                                <th className="px-5 py-3">Profesional</th>
                                <th className="px-5 py-3">Especialidades</th>
                                <th className="px-5 py-3">Servicios Habilitados</th>
                                <th className="px-5 py-3">Sedes</th>
                                <th className="px-5 py-3 text-center">Estado</th>
                                <th className="px-5 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="p-10 text-center text-gray-500">Cargando staff...</td></tr>
                            ) : filteredProfesionales.length === 0 ? (
                                <tr><td colSpan="6" className="p-10 text-center text-gray-500 italic">No se encontraron profesionales.</td></tr>
                            ) : (
                                filteredProfesionales.map(prof => (
                                    <tr key={prof.id} className="hover:bg-blue-50 transition border-b border-gray-100">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-gray-900">{prof.nombre}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <FaIdCard /> {prof.numero_documento}
                                            </div>
                                            <div className="text-xs text-blue-600 font-mono">RM: {prof.registro_medico}</div>
                                        </td>
                                        
                                        <td className="px-5 py-4 max-w-xs">
                                            <div className="flex flex-wrap">
                                                {getNombresByIds(prof.especialidades, especialidades)}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 max-w-xs">
                                            <div className="flex flex-wrap">
                                                {getNombresByIds(prof.servicios_habilitados, servicios)}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 max-w-xs">
                                            <div className="flex flex-wrap">
                                                {getNombresByIds(prof.lugares_atencion, lugares)}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button onClick={() => handleToggleStatus(prof)} className="text-2xl focus:outline-none">
                                                {prof.activo 
                                                    ? <FaToggleOn className="text-green-500 hover:text-green-600" title="Activo" />
                                                    : <FaToggleOff className="text-gray-400 hover:text-gray-500" title="Inactivo" />
                                                }
                                            </button>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button 
                                                onClick={() => openModal(prof)}
                                                className="text-blue-600 hover:text-blue-800 bg-blue-100 p-2 rounded-lg transition"
                                                title="Editar Información"
                                            >
                                                <FaEdit />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL DE CREACIÓN / EDICIÓN --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden transform transition-all">
                        
                        {/* Header Modal */}
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {isEditing ? <FaEdit/> : <FaUserMd/>} 
                                {isEditing ? 'Editar Profesional' : 'Registrar Nuevo Profesional'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-gray-200 text-2xl font-bold">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Datos Personales */}
                                <div className="md:col-span-2">
                                    <h4 className="text-sm font-bold text-gray-500 uppercase border-b pb-1 mb-3">Información Personal</h4>
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-bold mb-1 text-sm">Nombre Completo</label>
                                    <input type="text" name="nombre" required className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500"
                                        value={formData.nombre} onChange={handleChange} />
                                </div>
                                
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1 text-sm">Documento ID</label>
                                    <input type="text" name="numero_documento" required className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500"
                                        value={formData.numero_documento} onChange={handleChange} />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-bold mb-1 text-sm">Registro Médico (TP)</label>
                                    <input type="text" name="registro_medico" required className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500"
                                        value={formData.registro_medico} onChange={handleChange} />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-bold mb-1 text-sm">Email Corporativo</label>
                                    <input type="email" name="email_profesional" required className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500"
                                        value={formData.email_profesional} onChange={handleChange} />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-bold mb-1 text-sm">Teléfono Contacto</label>
                                    <input type="text" name="telefono_profesional" required className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500"
                                        value={formData.telefono_profesional} onChange={handleChange} />
                                </div>

                                {/* Asignaciones con CHECKBOXES */}
                                <div className="md:col-span-2 mt-4">
                                    <h4 className="text-sm font-bold text-gray-500 uppercase border-b pb-1 mb-3">Asignaciones Clínicas</h4>
                                    <p className="text-xs text-gray-400 mb-2 bg-blue-50 p-2 rounded">
                                        Selecciona las opciones correspondientes marcando las casillas.
                                    </p>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <RenderCheckboxList 
                                        items={especialidades} 
                                        listName="especialidades" 
                                        selectedIds={formData.especialidades} 
                                        label="Especialidades" 
                                        icon={<FaStethoscope className="text-blue-500"/>}
                                    />
                                    <RenderCheckboxList 
                                        items={servicios} 
                                        listName="servicios_habilitados" 
                                        selectedIds={formData.servicios_habilitados} 
                                        label="Servicios Habilitados" 
                                        icon={<FaNotesMedical className="text-green-500"/>}
                                    />
                                    <RenderCheckboxList 
                                        items={lugares} 
                                        listName="lugares_atencion" 
                                        selectedIds={formData.lugares_atencion} 
                                        label="Sedes de Atención" 
                                        icon={<FaMapMarkerAlt className="text-red-500"/>}
                                    />
                                </div>

                            </div>

                            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-bold transition">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-lg transition transform hover:scale-105">
                                    {isEditing ? 'Guardar Cambios' : 'Registrar Profesional'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProfesionales;