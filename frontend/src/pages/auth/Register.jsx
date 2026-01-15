import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import AuthLayout from '../../components/auth/AuthLayout';
import TermsModal from '../../components/auth/TermsModal';
import { authService } from '../../services/authService';

const MySwal = withReactContent(Swal);

const Register = () => {
    const navigate = useNavigate();
    
    // Estados del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        username: '',
        correo: '',
        tipo_documento: 'CC',
        documento: '',
        numero: '',
        password: '',
        confirmPassword: '',
        acepta_tratamiento_datos: false
    });

    const [showModal, setShowModal] = useState(true);
    const [loading, setLoading] = useState(false);
    
    // Manejador de cambios en inputs
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Manejador para cuando aceptan términos en el modal
    const handleAcceptTerms = () => {
        setFormData({ ...formData, acepta_tratamiento_datos: true });
        setShowModal(false);
    };

    // Envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Validaciones Frontend
        if (!formData.acepta_tratamiento_datos) {
            MySwal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Debes aceptar los términos y condiciones para continuar.',
                confirmButtonColor: '#2563eb'
            });
            setShowModal(true);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            MySwal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Las contraseñas no coinciden.',
                confirmButtonColor: '#ef4444'
            });
            return;
        }

        if (formData.password.length < 6) {
            MySwal.fire({
                icon: 'warning',
                title: 'Seguridad',
                text: 'La contraseña debe tener al menos 6 caracteres.',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        // 2. Envío al Backend
        setLoading(true);
        try {
            await authService.register(formData);
            
            // 3. Éxito
            await MySwal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: 'Tu cuenta ha sido creada exitosamente.',
                confirmButtonText: 'Ir a Iniciar Sesión',
                confirmButtonColor: '#16a34a',
                timer: 3000,
                timerProgressBar: true
            });

            navigate('/login');
            
        } catch (err) {
            console.error(err);
            
            // Manejo de mensaje de error legible
            let mensajeError = "Ocurrió un error al registrarse.";
            
            if (typeof err === 'object' && err !== null) {
                // Intenta sacar el primer mensaje de error del backend (ej: "username": ["Ya existe"])
                const firstKey = Object.keys(err)[0];
                const msg = Array.isArray(err[firstKey]) ? err[firstKey][0] : err[firstKey];
                mensajeError = firstKey === 'detail' ? msg : `${firstKey}: ${msg}`;
            }

            MySwal.fire({
                icon: 'error',
                title: 'Error en el registro',
                text: mensajeError,
                confirmButtonColor: '#d33'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Crear Cuenta">
            {/* Modal de Términos */}
            <TermsModal isOpen={showModal} onAccept={handleAcceptTerms} />

            <form onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Nombre Completo</label>
                    <input 
                        type="text" 
                        name="nombre" 
                        value={formData.nombre} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        required 
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">Tipo Doc.</label>
                        <select 
                            name="tipo_documento" 
                            value={formData.tipo_documento} 
                            onChange={handleChange} 
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="CC">Cédula</option>
                            <option value="TI">Tarjeta Identidad</option>
                            <option value="CE">Cédula Extranjería</option>
                            <option value="PAS">Pasaporte</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">Número</label>
                        <input 
                            type="text" 
                            name="documento" 
                            value={formData.documento} 
                            onChange={handleChange} 
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                            required 
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Usuario</label>
                    <input 
                        type="text" 
                        name="username" 
                        value={formData.username} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        required 
                    />
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Correo Electrónico</label>
                    <input 
                        type="email" 
                        name="correo" 
                        value={formData.correo} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        required 
                    />
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-1">Teléfono</label>
                    <input 
                        type="tel" 
                        name="numero" 
                        value={formData.numero} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        required 
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">Contraseña</label>
                        <input 
                            type="password" 
                            name="password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">Repetir</label>
                        <input 
                            type="password" 
                            name="confirmPassword" 
                            value={formData.confirmPassword} 
                            onChange={handleChange} 
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                            required 
                        />
                    </div>
                </div>

                <div className="text-xs text-center text-gray-500 mt-2">
                    {formData.acepta_tratamiento_datos ? (
                        <span className="text-green-600 font-bold flex justify-center items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            Términos aceptados
                        </span>
                    ) : (
                        <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => setShowModal(true)}>
                            Leer Términos y Condiciones
                        </span>
                    )}
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full font-bold py-3 rounded-lg transition transform hover:scale-[1.01] shadow-md mt-4 text-white
                        ${loading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}
                    `}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Procesando...
                        </span>
                    ) : 'Registrarse'}
                </button>

                <div className="text-center mt-4">
                    <small>¿Ya tienes cuenta? <Link to="/login" className="text-blue-600 font-bold hover:underline">Iniciar sesión</Link></small>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Register;