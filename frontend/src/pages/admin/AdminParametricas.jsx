import React, { useEffect, useState, useCallback } from 'react';
import { staffService } from '../../services/staffService';
import { patientService } from '../../services/patientService';
import Swal from 'sweetalert2';
import { 
    FaHospital, FaStethoscope, FaNotesMedical, FaEdit, 
    FaCheck, FaToggleOn, FaToggleOff, FaUsers, FaIdCard, FaPlusCircle
} from 'react-icons/fa';

const AdminParametricas = () => {
    // Tabs: sedes | especialidades | servicios | tipos
    const [activeTab, setActiveTab] = useState('sedes'); 
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Catálogo para el select múltiple en Servicios
    const [tiposPacienteOptions, setTiposPacienteOptions] = useState([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({});

    // Carga de datos unificada
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            let data = [];
            if (activeTab === 'sedes') data = await staffService.getLugares();
            if (activeTab === 'especialidades') data = await staffService.getEspecialidades();
            if (activeTab === 'servicios') data = await staffService.getServicios();
            if (activeTab === 'tipos') data = await patientService.getTiposPaciente();
            
            // Ordenar: Activos primero
            data.sort((a, b) => Number(b.activo) - Number(a.activo));
            setDataList(data);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        cargarDatos();
        if (activeTab === 'servicios') {
            cargarTiposExternos();
        }
    }, [activeTab, cargarDatos]);

    const cargarTiposExternos = async () => {
        try {
            const tipos = await patientService.getTiposPaciente();
            if (Array.isArray(tipos)) {
                setTiposPacienteOptions(tipos.filter(t => t.activo));
            }
        } catch (e) {
            console.error("Error cargando tipos de pacientes", e);
        }
    };

    const openModal = (item = null) => {
        setIsEditing(!!item);
        setCurrentId(item ? item.id : null);
        
        if (activeTab === 'sedes') {
            setFormData(item || { nombre: '', direccion: '', ciudad: '', activo: true });
        } else if (activeTab === 'especialidades') {
            setFormData(item || { nombre: '', descripcion: '', activo: true });
        } else if (activeTab === 'tipos') {
            setFormData(item || { nombre: '', activo: true });
        } else if (activeTab === 'servicios') {
            setFormData(item || { 
                nombre: '', 
                descripcion: '', 
                duracion_minutos: 30, 
                precio_base: 0, 
                tipos_paciente_ids: [],
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

    const handleTiposChange = (idTipo) => {
        const currentIds = formData.tipos_paciente_ids || [];
        if (currentIds.includes(idTipo)) {
            setFormData({ 
                ...formData, 
                tipos_paciente_ids: currentIds.filter(id => id !== idTipo) 
            });
        } else {
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
            } else if (activeTab === 'tipos') {
                isEditing ? await patientService.updateTipoPaciente(currentId, formData) : await patientService.createTipoPaciente(formData);
            }

            Swal.fire('Guardado', 'Registro actualizado correctamente', 'success');
            setIsModalOpen(false);
            cargarDatos();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar el registro', 'error');
        }
    };

    const handleToggle = async (item) => {
        try {
            const newState = !item.activo;
            const payload = { ...item, activo: newState };
            
            if (activeTab === 'sedes') await staffService.updateLugar(item.id, payload);
            if (activeTab === 'especialidades') await staffService.updateEspecialidad(item.id, payload);
            if (activeTab === 'servicios') await staffService.updateServicio(item.id, payload);
            if (activeTab === 'tipos') await patientService.updateTipoPaciente(item.id, payload);

            const msg = newState ? 'Activado' : 'Desactivado';
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
            Toast.fire({ icon: 'success', title: `Registro ${msg}` });
            cargarDatos();
        } catch {
            Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
        }
    };

    const getNombresTipos = (idsArray) => {
        if (!idsArray || idsArray.length === 0) return null;
        return idsArray.map(id => {
            const tipo = tiposPacienteOptions.find(t => t.id === id);
            return tipo ? tipo.nombre : `ID: ${id}`;
        });
    };

    // Helper para textos dinámicos del botón
    const getButtonLabel = () => {
        switch(activeTab) {
            case 'sedes': return { title: 'Nueva Sede', subtitle: 'Registrar Ubicación' };
            case 'especialidades': return { title: 'Nueva Especialidad', subtitle: 'Registrar Área' };
            case 'tipos': return { title: 'Nuevo Tipo', subtitle: 'Afiliación / EPS' };
            case 'servicios': return { title: 'Nuevo Servicio', subtitle: 'Configurar Oferta' };
            default: return { title: 'Nuevo', subtitle: 'Registro' };
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 relative">
            
            {/* Header y Botón Principal (Diseño Premium) */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-gradient-to-r from-gray-50 to-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <FaCheck className="text-green-600"/> Paramétricas del Sistema
                    </h1>
                    <p className="text-gray-500 font-medium mt-1 ml-1">Configura las bases maestras de tu aplicación.</p>
                </div>

                {/* BOTÓN ANIMADO TIPO "AGENDAR ADMIN" */}
                <button 
                    onClick={() => openModal()}
                    className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 overflow-hidden active:scale-95"
                >
                    <div className="absolute inset-0 w-full h-full transition-all duration-300 scale-0 group-hover:scale-100 group-hover:bg-white/10 rounded-2xl"></div>
                    <FaPlusCircle className="mr-3 text-xl animate-bounce" />
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-[10px] uppercase tracking-widest opacity-80 font-black">Crear</span>
                        <span className="text-lg">{getButtonLabel().title}</span>
                    </div>
                </button>
            </div>

            {/* Navegación de Tabs */}
            <div className="flex overflow-x-auto bg-gray-50 rounded-t-xl border-t border-x border-gray-200 mb-0">
                {[
                    { id: 'sedes', label: 'Sedes', icon: <FaHospital/> },
                    { id: 'especialidades', label: 'Especialidades', icon: <FaStethoscope/> },
                    { id: 'tipos', label: 'Tipos Paciente', icon: <FaIdCard/> },
                    { id: 'servicios', label: 'Servicios', icon: <FaNotesMedical/> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-4 font-bold flex items-center gap-2 whitespace-nowrap transition-all text-xs uppercase tracking-widest flex-1 justify-center
                            ${activeTab === tab.id 
                                ? 'border-b-4 border-blue-600 text-blue-600 bg-white shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}
                        `}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tabla de Contenido */}
            <div className="bg-white shadow-2xl rounded-b-xl overflow-hidden border border-gray-200 min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead className="bg-gray-800 text-white uppercase font-black text-[10px] tracking-widest">
                            <tr>
                                <th className="px-6 py-4 text-left">Nombre</th>
                                <th className="px-6 py-4 text-left">Detalles</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="4" className="p-24 text-center text-gray-400"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>Cargando datos...</td></tr>
                            ) : dataList.length === 0 ? (
                                <tr><td colSpan="4" className="p-24 text-center text-gray-400 italic">No hay registros configurados.</td></tr>
                            ) : dataList.map((item) => (
                                <tr key={item.id} className={`hover:bg-blue-50/50 transition ${!item.activo ? 'bg-gray-50 opacity-60' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 text-sm">{item.nombre}</div>
                                        {!item.activo && <span className="text-[10px] text-red-500 font-black uppercase tracking-wider">Inactivo</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {activeTab === 'sedes' && <span className="font-mono text-xs text-gray-500">{item.ciudad} • {item.direccion}</span>}
                                        {activeTab === 'especialidades' && (item.descripcion || <span className="italic text-gray-300">Sin descripción</span>)}
                                        {activeTab === 'tipos' && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold">Afiliación</span>}
                                        {activeTab === 'servicios' && (
                                            <div>
                                                <div className="font-black text-gray-800 text-xs mb-1">{item.duracion_minutos} min | ${item.precio_base}</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {(!item.tipos_paciente_ids || item.tipos_paciente_ids.length === 0) ? (
                                                        <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200 flex items-center gap-1 font-bold">
                                                            <FaUsers size={8}/> TODOS
                                                        </span>
                                                    ) : (
                                                        getNombresTipos(item.tipos_paciente_ids)?.map((nombre, idx) => (
                                                            <span key={idx} className="text-[9px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 font-bold uppercase">
                                                                {nombre}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleToggle(item)} className="text-2xl focus:outline-none transition-transform active:scale-90" title={item.activo ? "Desactivar" : "Activar"}>
                                            {item.activo ? <FaToggleOn className="text-green-500"/> : <FaToggleOff className="text-gray-300"/>}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => openModal(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Editar">
                                            <FaEdit size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Principal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 transform transition-all scale-100">
                        <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex justify-between items-center text-white">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    {isEditing ? <FaEdit/> : <FaPlusCircle/>} 
                                    {isEditing ? 'Editar Registro' : getButtonLabel().title}
                                </h3>
                                <p className="text-xs text-blue-200 opacity-80">{activeTab.toUpperCase()}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition text-white">&times;</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            
                            {/* CAMPO NOMBRE (Común) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nombre</label>
                                <input 
                                    name="nombre" 
                                    value={formData.nombre} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full border-gray-300 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700"
                                    placeholder="Ej: Particular, Eps..."
                                />
                            </div>

                            {/* CAMPOS SERVICIOS */}
                            {activeTab === 'servicios' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Duración (min)</label>
                                            <input type="number" name="duracion_minutos" value={formData.duracion_minutos} onChange={handleChange} className="w-full border-gray-300 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Precio Base</label>
                                            <input type="number" name="precio_base" value={formData.precio_base} onChange={handleChange} className="w-full border-gray-300 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                                        </div>
                                    </div>

                                    <div className="border border-blue-100 p-4 rounded-xl bg-blue-50/30">
                                        <label className="block text-xs font-bold text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <FaUsers/> Disponible para (Afiliación)
                                        </label>
                                        <div className="max-h-32 overflow-y-auto grid grid-cols-1 gap-1 custom-scrollbar pr-2">
                                            {tiposPacienteOptions.map(tipo => (
                                                <label key={tipo.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={formData.tipos_paciente_ids?.includes(tipo.id)}
                                                        onChange={() => handleTiposChange(tipo.id)}
                                                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">{tipo.nombre}</span>
                                                </label>
                                            ))}
                                            {tiposPacienteOptions.length === 0 && <span className="text-xs text-red-500 italic p-2">No hay tipos definidos. Crea uno en la pestaña 'Tipos Paciente'.</span>}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2 border-t border-blue-100 pt-2 italic">
                                            {(!formData.tipos_paciente_ids || formData.tipos_paciente_ids.length === 0) 
                                                ? "ℹ️ Visible para TODOS los pacientes." 
                                                : `✅ Restringido a ${formData.tipos_paciente_ids.length} tipos.`}
                                        </p>
                                    </div>
                                </>
                            )}
                            
                            {/* CAMPOS SEDES */}
                            {activeTab === 'sedes' && (
                                <>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Ciudad</label><input name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full border-gray-300 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Dirección</label><input name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border-gray-300 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                                </>
                            )}
                            
                            {/* CAMPOS ESPECIALIDADES */}
                            {activeTab === 'especialidades' && (
                                <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Descripción</label><textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="3" className="w-full border-gray-300 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea></div>
                            )}

                            {/* TIPOS PACIENTE (Solo informativo) */}
                            {activeTab === 'tipos' && (
                                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-xs flex gap-3 items-start border border-yellow-100">
                                    <span className="text-lg">💡</span>
                                    <p>Define categorías de afiliación como: <b>EPS Sura, Particular, Medicina Prepagada, Convenio Empresarial</b>, etc.</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors text-sm">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 font-bold transition-all active:scale-95 text-sm flex items-center gap-2">
                                    <FaCheck/> Guardar Cambios
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