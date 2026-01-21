import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import Swal from 'sweetalert2';
import { FaUser, FaIdCard, FaPhone, FaMapMarkerAlt, FaVenusMars, FaSave, FaHospitalUser } from 'react-icons/fa';

const Perfil = () => {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [tiposPaciente, setTiposPaciente] = useState([]);
    const [existePerfil, setExistePerfil] = useState(false);
    
    // Nombre del tipo para mostrar (ej: "EPS SURA")
    const [nombreAfiliacion, setNombreAfiliacion] = useState('');

    const [formData, setFormData] = useState({
        user_id: user?.user_id || user?.id,
        nombre: '',
        apellido: '',
        tipo_documento: 'CC',
        numero_documento: '',
        fecha_nacimiento: '',
        genero: 'M',
        direccion: '',
        telefono: '',
        email_contacto: user?.email || '', 
        tipo_usuario: null 
    });

    useEffect(() => {
        if (user) cargarDatos();
    }, [user]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [tipos, perfil] = await Promise.all([
                patientService.getTiposPaciente(), // Asegúrate que la función se llame así en tu servicio
                patientService.getMyProfile(user.user_id || user.id)
            ]);
            
            setTiposPaciente(tipos);

            if (perfil) {
                setExistePerfil(true);
                setFormData(perfil);

                // --- LÓGICA ROBUSTA PARA OBTENER EL NOMBRE ---
                let nombreReal = 'Sin Validar';

                // Caso 1: El backend ya manda el nombre en un campo calculado (Ideal)
                if (perfil.tipo_usuario_nombre) {
                    nombreReal = perfil.tipo_usuario_nombre;
                } 
                // Caso 2: El campo tipo_usuario es un objeto { id, nombre }
                else if (perfil.tipo_usuario && typeof perfil.tipo_usuario === 'object') {
                    nombreReal = perfil.tipo_usuario.nombre;
                }
                // Caso 3: El campo tipo_usuario es solo un ID, buscamos en el catálogo 'tipos'
                else if (perfil.tipo_usuario) {
                    const tipoEncontrado = tipos.find(t => t.id === parseInt(perfil.tipo_usuario));
                    if (tipoEncontrado) nombreReal = tipoEncontrado.nombre;
                }

                setNombreAfiliacion(nombreReal);
            } else {
                // Si no tiene perfil, pre-llenamos con datos del Auth
                setFormData(prev => ({
                    ...prev,
                    nombre: user.nombre || '',
                    numero_documento: user.documento || ''
                }));
            }
        } catch (error) {
            console.error("Error cargando perfil", error);
            Swal.fire('Error', 'No se pudo cargar la información del perfil.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (existePerfil) {
                // Preparamos payload limpio (sin campos anidados que rompan el backend)
                const payload = { ...formData };
                
                // Si tipo_usuario es un objeto, lo convertimos a ID o lo quitamos para no sobrescribirlo
                if (typeof payload.tipo_usuario === 'object' && payload.tipo_usuario !== null) {
                    payload.tipo_usuario = payload.tipo_usuario.id;
                }
                
                // Nota: Idealmente no enviamos tipo_usuario en updates de perfil personal para seguridad
                delete payload.tipo_usuario; 
                delete payload.tipo_usuario_nombre;

                await patientService.update(formData.id, payload);
                Swal.fire('Actualizado', 'Tus datos han sido actualizados.', 'success');
                // Recargar para refrescar nombres si algo cambió
                cargarDatos(); 
            } else {
                // CREACIÓN
                const payload = {
                    ...formData,
                    tipo_usuario: null // Se crea como "Por definir" o "Particular" según lógica backend
                };

                await patientService.create(payload);
                setExistePerfil(true);
                Swal.fire('Creado', 'Perfil creado exitosamente.', 'success');
                window.location.reload();
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron guardar los datos.', 'error');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Cargando información personal...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
                {existePerfil ? 'Mi Información Personal' : 'Completar Registro'}
            </h1>
            <p className="text-gray-500 mb-6">Mantén tus datos actualizados para una mejor atención.</p>

            <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
                
                {/* SECCIÓN INFORMATIVA DE AFILIACIÓN */}
                <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Estado de Afiliación</h3>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                            {existePerfil ? (nombreAfiliacion || 'Particular / Sin Validar') : 'Usuario Nuevo'}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            * Este dato es gestionado administrativamente.
                        </p>
                    </div>
                    <FaHospitalUser className="text-4xl text-blue-200" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <label className="block text-gray-700 font-bold mb-2">Nombres</label>
                         <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full border rounded-lg p-3 bg-gray-50 focus:outline-none" readOnly />
                         <p className="text-xs text-gray-400 mt-1">Para corregir nombres, contacta soporte.</p>
                    </div>
                    <div>
                         <label className="block text-gray-700 font-bold mb-2">Apellidos</label>
                         <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Teléfono</label>
                        <div className="flex items-center border rounded-lg p-2 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                            <FaPhone className="text-gray-400 mr-2" />
                            <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full bg-transparent outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Dirección</label>
                        <div className="flex items-center border rounded-lg p-2 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                            <FaMapMarkerAlt className="text-gray-400 mr-2" />
                            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full bg-transparent outline-none" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Fecha Nacimiento</label>
                        <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Género</label>
                         <select name="genero" value={formData.genero} onChange={handleChange} className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                            <option value="O">Otro</option>
                        </select>
                    </div>
                </div>

                <div className="mt-8 flex justify-end border-t pt-6">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                        <FaSave /> {existePerfil ? 'Actualizar Datos' : 'Guardar Perfil'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Perfil;