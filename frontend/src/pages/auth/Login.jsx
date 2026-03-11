import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthContext } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

const MySwal = withReactContent(Swal);

const Login = () => {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);
    const { t, language } = useUI();

    const [credentials, setCredentials] = useState({ documento: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(credentials);

            MySwal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: language === 'en' ? 'Welcome back!' : 'Bienvenido de nuevo',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                },
            });

            setCredentials((prev) => ({ ...prev, password: '' }));

            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } catch (error) {
            console.error(error);
            setCredentials((prev) => ({ ...prev, password: '' }));

            MySwal.fire({
                icon: 'error',
                title: language === 'en' ? 'Login error' : 'Error de acceso',
                text: language === 'en'
                    ? 'Incorrect document or password. Please verify.'
                    : 'Documento o contrasena incorrectos. Por favor verifique.',
                confirmButtonColor: '#d33',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title={t('login')}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">{t('identityDocument')}</label>
                    <input
                        type="text"
                        name="documento"
                        value={credentials.documento}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 transition-colors hover:bg-white dark:hover:bg-slate-700"
                        placeholder="123456789"
                        required
                        autoComplete="username"
                        inputMode="numeric"
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="none"
                    />
                </div>

                <div>
                    <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">{t('password')}</label>
                    <input
                        type="password"
                        name="password"
                        value={credentials.password}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 transition-colors hover:bg-white dark:hover:bg-slate-700"
                        placeholder="........"
                        required
                        autoComplete="current-password"
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="none"
                    />
                    <div className="text-right mt-2">
                        <Link to="/forgot-password" className="text-sm text-blue-500 hover:text-blue-700 font-medium transition-colors">
                            {t('forgotPassword')}
                        </Link>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full font-bold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-md text-white ${loading ? 'bg-blue-400 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:to-blue-800'}`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('validate')}
                        </span>
                    ) : t('enter')}
                </button>

                <div className="text-center mt-6">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t('noAccount')}</p>
                    <Link to="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-colors">
                        {t('registerHere')}
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Login;

