import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import Swal from 'sweetalert2';
import { FaUser, FaIdCard, FaPhone, FaMapMarkerAlt, FaVenusMars, FaSave } from 'react-icons/fa';

const Perfil = () => {
    const { user } = useContext(AuthContext); // ID del usuario logueado
    const [loading, setLoading] = useState(true);
    const [tiposPaciente, setTiposPaciente] = useState([]);
    const [existePerfil, setExistePerfil] = useState(false);
    
    // Estado del formulario basado en tu modelo Paciente
    const [formData, setFormData] = useState({
        user_id: user?.user_id, // Vinculamos con Auth
        nombre: '',
        apellido: '',
        tipo_documento: 'CC',
        numero_documento: '',
        fecha_nacimiento: '',
        genero: 'M',
        direccion: '',
        telefono: '',
        email_contacto: user?.email || '', // Heredamos el email del login
        tipo_usuario: '' // ID del TipoPaciente
    });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            // 1. Cargar catálogo de Tipos (EPS, etc.)
            const tipos = await patientService.getTipos();
            setTiposPaciente(tipos);

            // 2. Buscar si ya existe perfil
            const perfil = await patientService.getMyProfile(user.user_id);
            
            if (perfil) {
                setExistePerfil(true);
                setFormData(perfil); // Rellenar formulario
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
                await patientService.update(formData.id, formData);
                Swal.fire('Actualizado', 'Tus datos han sido actualizados.', 'success');
            } else {
                // Crear nuevo
                await patientService.create(formData);
                setExistePerfil(true);
                Swal.fire('Creado', 'Perfil de paciente creado exitosamente.', 'success');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron guardar los datos.', 'error');
        }
    };

    if (loading) return <div>Cargando perfil...</div>;

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-blue-900 mb-6">
                {existePerfil ? 'Mi Información Personal' : 'Completa tu Registro'}
            </h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Nombres y Apellidos */}
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Nombres</label>
                        <div className="flex items-center border rounded-lg p-2 bg-gray-50">
                            <FaUser className="text-gray-400 mr-2" />
                            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full bg-transparent outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Apellidos</label>
                        <div className="flex items-center border rounded-lg p-2 bg-gray-50">
                            <FaUser className="text-gray-400 mr-2" />
                            <input type="text" name="apellido" value={formData.apellido} onChange={handleChange} required className="w-full bg-transparent outline-none" />
                        </div>
                    </div>

                    {/* Documento */}
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Tipo Documento</label>
                        <select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} className="w-full border rounded-lg p-3 outline-none">
                            <option value="CC">Cédula de Ciudadanía</option>
                            <option value="TI">Tarjeta de Identidad</option>
                            <option value="CE">Cédula de Extranjería</option>
                            <option value="RC">Registro Civil</option>
                            <option value="PA">Pasaporte</option>
                            <option value="PT">Permiso Protección Temporal</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Número Documento</label>
                        <div className="flex items-center border rounded-lg p-2 bg-gray-50">
                            <FaIdCard className="text-gray-400 mr-2" />
                            <input type="text" name="numero_documento" value={formData.numero_documento} onChange={handleChange} required className="w-full bg-transparent outline-none" />
                        </div>
                    </div>

                    {/* Datos Personales */}
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Fecha Nacimiento</label>
                        <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required className="w-full border rounded-lg p-3 outline-none" />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Género</label>
                        <div className="flex items-center border rounded-lg p-2 bg-gray-50">
                            <FaVenusMars className="text-gray-400 mr-2" />
                            <select name="genero" value={formData.genero} onChange={handleChange} className="w-full bg-transparent outline-none">
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                                <option value="O">Otro</option>
                            </select>
                        </div>
                    </div>

                    {/* Contacto */}
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Teléfono</label>
                        <div className="flex items-center border rounded-lg p-2 bg-gray-50">
                            <FaPhone className="text-gray-400 mr-2" />
                            <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full bg-transparent outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Dirección</label>
                        <div className="flex items-center border rounded-lg p-2 bg-gray-50">
                            <FaMapMarkerAlt className="text-gray-400 mr-2" />
                            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full bg-transparent outline-none" />
                        </div>
                    </div>

                    {/* Afiliación */}
                    <div className="col-span-2">
                        <label className="block text-gray-700 font-bold mb-2">Tipo de Afiliación (EPS/Prepagada)</label>
                        <select name="tipo_usuario" value={formData.tipo_usuario} onChange={handleChange} required className="w-full border rounded-lg p-3 outline-none">
                            <option value="">-- Seleccione --</option>
                            {tiposPaciente.map(tipo => (
                                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                            ))}
                        </select>
                    </div>

                </div>

                <div className="mt-8 flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition">
                        <FaSave /> Guardar Información
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Perfil;