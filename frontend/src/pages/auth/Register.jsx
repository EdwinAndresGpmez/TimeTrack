import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import AuthLayout from '../../components/auth/AuthLayout';
import TermsModal from '../../components/auth/TermsModal';
import { authService } from '../../services/authService';
import { useUI } from '../../context/UIContext';

const MySwal = withReactContent(Swal);

const Register = () => {
    const navigate = useNavigate();
    const { t, language } = useUI();

    const [formData, setFormData] = useState({
        nombre: '',
        apellidos: '',
        username: '',
        correo: '',
        tipo_documento: 'CC',
        documento: '',
        numero: '',
        password: '',
        confirmPassword: '',
        acepta_tratamiento_datos: false,
    });

    const [showModal, setShowModal] = useState(true);
    const [loading, setLoading] = useState(false);
    const [documentTypes, setDocumentTypes] = useState([
        { codigo: 'CC', nombre: 'Cedula' },
        { codigo: 'TI', nombre: 'Tarjeta Identidad' },
        { codigo: 'CE', nombre: 'Cedula Extranjeria' },
        { codigo: 'PAS', nombre: 'Pasaporte' },
    ]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAcceptTerms = () => {
        setFormData({ ...formData, acepta_tratamiento_datos: true });
        setShowModal(false);
    };

    useEffect(() => {
        const cargarTiposDocumento = async () => {
            try {
                const tipos = await authService.getDocumentTypes();
                if (Array.isArray(tipos) && tipos.length > 0) {
                    setDocumentTypes(tipos);
                    setFormData((prev) => {
                        const existe = tipos.some((tipo) => tipo.codigo === prev.tipo_documento);
                        return existe ? prev : { ...prev, tipo_documento: tipos[0].codigo };
                    });
                }
            } catch (error) {
                console.warn('No se pudo cargar catalogo de tipos de documento. Se usa fallback local.', error);
            }
        };

        cargarTiposDocumento();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.acepta_tratamiento_datos) {
            MySwal.fire({
                icon: 'warning',
                title: language === 'en' ? 'Attention' : 'Atencion',
                text: language === 'en'
                    ? 'You must accept terms and conditions to continue.'
                    : 'Debes aceptar los terminos y condiciones para continuar.',
                confirmButtonColor: '#2563eb',
            });
            setShowModal(true);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            MySwal.fire({
                icon: 'error',
                title: language === 'en' ? 'Error' : 'Error',
                text: language === 'en' ? 'Passwords do not match.' : 'Las contrasenas no coinciden.',
                confirmButtonColor: '#ef4444',
            });
            return;
        }

        if (formData.password.length < 6) {
            MySwal.fire({
                icon: 'warning',
                title: language === 'en' ? 'Security' : 'Seguridad',
                text: language === 'en'
                    ? 'Password must have at least 6 characters.'
                    : 'La contrasena debe tener al menos 6 caracteres.',
                confirmButtonColor: '#f59e0b',
            });
            return;
        }

        setLoading(true);
        try {
            await authService.register(formData);

            await MySwal.fire({
                icon: 'success',
                title: language === 'en' ? 'Welcome!' : 'Bienvenido',
                text: language === 'en'
                    ? 'Your account was created successfully.'
                    : 'Tu cuenta ha sido creada exitosamente.',
                confirmButtonText: language === 'en' ? 'Go to sign in' : 'Ir a iniciar sesion',
                confirmButtonColor: '#16a34a',
                timer: 3000,
                timerProgressBar: true,
            });

            navigate('/login');
        } catch (err) {
            console.error(err);

            let mensajeError = language === 'en'
                ? 'An error occurred while creating your account.'
                : 'Ocurrio un error al registrarse.';

            if (typeof err === 'object' && err !== null) {
                const firstKey = Object.keys(err)[0];
                const msg = Array.isArray(err[firstKey]) ? err[firstKey][0] : err[firstKey];
                mensajeError = firstKey === 'detail' ? msg : `${firstKey}: ${msg}`;
            }

            MySwal.fire({
                icon: 'error',
                title: language === 'en' ? 'Registration error' : 'Error en el registro',
                text: mensajeError,
                confirmButtonColor: '#d33',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title={t('register')}>
            <TermsModal isOpen={showModal} onAccept={handleAcceptTerms} />

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-1">{t('names')}</label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-1">{t('lastNames')}</label>
                        <input
                            type="text"
                            name="apellidos"
                            value={formData.apellidos}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-1">{t('docType')}</label>
                        <select
                            name="tipo_documento"
                            value={formData.tipo_documento}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                        >
                            {documentTypes.map((tipo) => (
                                <option key={tipo.codigo} value={tipo.codigo}>
                                    {tipo.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-1">{t('number')}</label>
                        <input
                            type="text"
                            name="documento"
                            value={formData.documento}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-1">{t('user')}</label>
                    <input
                        type="text"
                        name="username"
                        autoComplete="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                        required
                    />
                </div>

                <div>
                    <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-1">{t('email')}</label>
                    <input
                        type="email"
                        name="correo"
                        value={formData.correo}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                        required
                    />
                </div>

                <div>
                    <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-1">{t('phone')}</label>
                    <input
                        type="tel"
                        name="numero"
                        autoComplete="tel"
                        value={formData.numero}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-1">{t('password')}</label>
                        <input
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-1">{t('repeat')}</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            autoComplete="new-password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
                            required
                        />
                    </div>
                </div>

                <div className="text-xs text-center text-gray-500 dark:text-gray-300 mt-2">
                    {formData.acepta_tratamiento_datos ? (
                        <span className="text-green-600 font-bold flex justify-center items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            {t('termsAccepted')}
                        </span>
                    ) : (
                        <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => setShowModal(true)}>
                            {t('readTerms')}
                        </span>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full font-bold py-3 rounded-lg transition transform hover:scale-[1.01] shadow-md mt-4 text-white ${loading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('processing')}
                        </span>
                    ) : t('register')}
                </button>

                <div className="text-center mt-4">
                    <small className="text-gray-600 dark:text-gray-300">{t('alreadyHaveAccount')} <Link to="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">{t('signIn')}</Link></small>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Register;

