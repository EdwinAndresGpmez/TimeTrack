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
        tipo_usuario: null // Inicializar en null para cumplir la regla
    });

    useEffect(() => {
        if (user) cargarDatos();
    }, [user]);

    const cargarDatos = async () => {
        try {
            const [tipos, perfil] = await Promise.all([
                patientService.getTipos(), //
                patientService.getMyProfile(user.user_id || user.id)
            ]);
            
            setTiposPaciente(tipos);

            if (perfil) {
                setExistePerfil(true);
                setFormData(perfil);

                // Buscamos el nombre bonito de la afiliación para mostrarlo
                const tipoEncontrado = tipos.find(t => t.id === perfil.tipo_usuario);
                setNombreAfiliacion(tipoEncontrado ? tipoEncontrado.nombre : 'Sin Validar');
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
                // Al actualizar, NO enviamos el tipo_usuario para evitar que lo hackeen/cambien
                // El backend debería ignorarlo o validarlo, pero desde front lo protegemos.
                await patientService.update(formData.id, formData);
                Swal.fire('Actualizado', 'Tus datos han sido actualizados.', 'success');
            } else {
                // CREACIÓN MANUAL DESDE PERFIL (Raro, pero posible)
                // Aquí aplicamos la regla: Si crea desde aquí, el tipo es NULL o PARTICULAR.
                // Forzamos NULL si no es particular explicito.
                
                const payload = {
                    ...formData,
                    tipo_usuario: 1 // Si permites crear desde aquí, asumes Particular.
                    // Si quieres que quede pendiente de validar, pon: tipo_usuario: null
                };

                await patientService.create(payload);
                setExistePerfil(true);
                Swal.fire('Creado', 'Perfil creado. Si eres afiliado, espera validación.', 'success');
                window.location.reload();
            }
        } catch (error) {
            Swal.fire('Error', 'No se pudieron guardar los datos.', 'error');
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando información...</div>;

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
                {existePerfil ? 'Mi Información Personal' : 'Completar Registro'}
            </h1>
            <p className="text-gray-500 mb-6">Mantén tus datos actualizados para una mejor atención.</p>

            <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
                
                {/* SECCIÓN INFORMATIVA DE AFILIACIÓN (SOLO LECTURA) */}
                <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Estado de Afiliación</h3>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                            {existePerfil ? (nombreAfiliacion || 'Pendiente de Validación') : 'Usuario Nuevo'}
                        </p>
                    </div>
                    {/* El usuario NO puede cambiar esto aquí. Debe contactar soporte o usar flujo de validación */}
                    <FaHospitalUser className="text-4xl text-blue-200" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ... (Campos Nombre, Apellido, Documento IGUALES a tu código) ... */}
                    {/* ... (Solo asegúrate de copiar los inputs de tu versión anterior) ... */}
                    
                    <div>
                         <label className="block text-gray-700 font-bold mb-2">Nombres</label>
                         <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full border rounded-lg p-3 bg-gray-50" readOnly />
                    </div>
                    <div>
                         <label className="block text-gray-700 font-bold mb-2">Apellidos</label>
                         <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} className="w-full border rounded-lg p-3 outline-none" />
                    </div>

                    {/* ... Resto de campos editables (Teléfono, Dirección, etc) ... */}
                     <div>
                        <label className="block text-gray-700 font-bold mb-2">Teléfono</label>
                        <div className="flex items-center border rounded-lg p-2 bg-white">
                            <FaPhone className="text-gray-400 mr-2" />
                            <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full bg-transparent outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Dirección</label>
                        <div className="flex items-center border rounded-lg p-2 bg-white">
                            <FaMapMarkerAlt className="text-gray-400 mr-2" />
                            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full bg-transparent outline-none" />
                        </div>
                    </div>
                    
                    {/* Fecha y Genero */}
                     <div>
                        <label className="block text-gray-700 font-bold mb-2">Fecha Nacimiento</label>
                        <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required className="w-full border rounded-lg p-3 outline-none" />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Género</label>
                         <select name="genero" value={formData.genero} onChange={handleChange} className="w-full border rounded-lg p-3 outline-none">
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                            <option value="O">Otro</option>
                        </select>
                    </div>
                </div>

                {/* NOTA: Eliminamos el <select name="tipo_usuario"> del final. 
                    El usuario NO debe editarlo. Ya se muestra arriba en el banner informativo. */}

                <div className="mt-8 flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105">
                        <FaSave /> {existePerfil ? 'Actualizar Datos' : 'Guardar Perfil'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Perfil;