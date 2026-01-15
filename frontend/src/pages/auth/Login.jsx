import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthContext } from '../../context/AuthContext'; // <--- Importamos el contexto

const MySwal = withReactContent(Swal);

const Login = () => {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);
    const [credentials, setCredentials] = useState({ documento: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Llamamos a la función login del AuthContext (no al servicio directo)
            await login(credentials);
            
            // Alerta tipo "Toast" (Pequeña en la esquina superior)
            MySwal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: '¡Bienvenido de nuevo!',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });

            // Redirigir al home
            setTimeout(() => {
                navigate('/dashboard'); 
            }, 1500);

        } catch (error) {
            console.error(error);
            MySwal.fire({
                icon: 'error',
                title: 'Error de acceso',
                text: 'Documento o contraseña incorrectos. Por favor verifique.',
                confirmButtonColor: '#d33'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Iniciar Sesión">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Documento de Identidad</label>
                    <input 
                        type="text" 
                        name="documento" 
                        value={credentials.documento} 
                        onChange={handleChange}
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-colors hover:bg-white"
                        placeholder="Ej: 123456789"
                        required 
                    />
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">Contraseña</label>
                    <input 
                        type="password" 
                        name="password" 
                        value={credentials.password} 
                        onChange={handleChange}
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-colors hover:bg-white"
                        placeholder="••••••••"
                        required 
                    />
                    <div className="text-right mt-2">
                        <Link to="/forgot-password" className="text-sm text-blue-500 hover:text-blue-700 font-medium transition-colors">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full font-bold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-md text-white
                        ${loading ? 'bg-blue-400 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:to-blue-800'}
                    `}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Validando...
                        </span>
                    ) : 'Ingresar'}
                </button>

                <div className="text-center mt-6">
                    <p className="text-sm text-gray-600 mb-1">¿No tienes cuenta?</p>
                    <Link to="/register" className="text-blue-600 font-bold hover:underline transition-colors">
                        Regístrate aquí
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Login;