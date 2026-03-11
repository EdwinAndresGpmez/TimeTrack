import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { FaBars, FaBell, FaMoon, FaSun, FaDesktop, FaGlobe } from 'react-icons/fa';
import DataUpdateEnforcer from './DataUpdateEnforcer';
import { patientService } from '../../services/patientService';
import ClinicGuideAssistant from './ClinicGuideAssistant';
import { useUI } from '../../context/UIContext';

const NOTIF_REFRESH_EVENT = 'tt:audit-notifications-refresh';

const NotificationBell = ({ title }) => {
    const [count, setCount] = useState(0);
    const [animate, setAnimate] = useState(false);

    const startedRef = useRef(false);
    const aliveRef = useRef(true);
    const animTimerRef = useRef(null);
    const intervalRef = useRef(null);
    const inFlightRef = useRef(false);

    useEffect(() => {
        return () => {
            aliveRef.current = false;
            if (animTimerRef.current) clearTimeout(animTimerRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const checkNotifications = useCallback(async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;

        try {
            const pendientes = await patientService.getSolicitudesPendientes();
            const nuevos = Array.isArray(pendientes) ? pendientes.length : (pendientes?.results?.length ?? 0);

            if (!aliveRef.current) return;

            setCount((prevCount) => {
                if (nuevos > prevCount) {
                    setAnimate(true);
                    if (animTimerRef.current) clearTimeout(animTimerRef.current);
                    animTimerRef.current = setTimeout(() => {
                        if (aliveRef.current) setAnimate(false);
                    }, 900);
                }
                return nuevos;
            });
        } catch (e) {
            console.warn('Notificaciones no disponibles (patients-ms):', e?.message || e);
        } finally {
            inFlightRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        checkNotifications();
        intervalRef.current = setInterval(checkNotifications, 30000);

        const onRefresh = () => checkNotifications();
        window.addEventListener(NOTIF_REFRESH_EVENT, onRefresh);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.removeEventListener(NOTIF_REFRESH_EVENT, onRefresh);
        };
    }, [checkNotifications]);

    return (
        <Link
            to="/dashboard/admin/validar-usuarios"
            className="relative p-2 mr-2 sm:mr-6 text-gray-500 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors group"
            title={title}
        >
            <FaBell className={`text-xl group-hover:text-blue-600 transition-colors ${animate ? 'animate-swing text-blue-600' : ''}`} />

            {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md animate-pulse border-2 border-white dark:border-slate-900">
                    {count > 9 ? '9+' : count}
                </span>
            )}

            <style>{`
                @keyframes swing {
                    0%, 100% { transform: rotate(0deg); }
                    20% { transform: rotate(15deg); }
                    40% { transform: rotate(-10deg); }
                    60% { transform: rotate(5deg); }
                    80% { transform: rotate(-5deg); }
                }
                .animate-swing { animation: swing 0.5s ease-in-out; }
            `}</style>
        </Link>
    );
};

const DashboardLayout = () => {
    const { logout, user } = useContext(AuthContext);
    const { t, theme, setTheme, language, setLanguage } = useUI();

    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 1024px)').matches);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 1024px)');
        const onChange = (e) => setIsMobile(e.matches);
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        if (isMobile) setSidebarOpen(false);
        else setSidebarOpen(true);
    }, [isMobile]);

    const isAdmin = user?.is_superuser || user?.is_staff || user?.roles?.includes('Administrador');

    const sidebarBranding = JSON.parse(localStorage.getItem('branding') || '{}');
    const sidebarVariant = sidebarBranding.variant || 'floating';

    let sidebarWidth = 0;
    if (!isMobile) {
        sidebarWidth = isSidebarOpen ? 288 : 96;
        if (sidebarVariant === 'compact') sidebarWidth = 80;
        if (sidebarVariant === 'sidebar-right') sidebarWidth = isSidebarOpen ? 288 : 96;
    }

    const [sidebarKey, setSidebarKey] = useState(sidebarVariant);
    useEffect(() => {
        setSidebarKey(sidebarVariant);
    }, [sidebarVariant]);

    const topbarHeight = !isMobile && sidebarVariant === 'topbar' ? 70 : 0;

    return (
        <div className="min-h-screen bg-gray-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex" key={sidebarKey}>
            <DataUpdateEnforcer />
            <ClinicGuideAssistant />

            {sidebarVariant !== 'sidebar-right' && (
                <Sidebar
                    isOpen={isSidebarOpen}
                    isMobile={isMobile}
                    toggleSidebar={() => setSidebarOpen((v) => !v)}
                    onClose={() => setSidebarOpen(false)}
                    logout={logout}
                />
            )}

            <div
                className={`flex-1 transition-all duration-300 ${sidebarVariant === 'sidebar-right' ? 'order-1' : ''}`}
                style={{
                    marginLeft: !isMobile && sidebarVariant !== 'topbar' && sidebarVariant !== 'sidebar-right' ? sidebarWidth : 0,
                    marginRight: !isMobile && sidebarVariant === 'sidebar-right' ? sidebarWidth : 0,
                    minHeight: '100vh',
                    paddingTop: topbarHeight,
                }}
            >
                <header className="bg-white dark:bg-slate-900 shadow-sm h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setSidebarOpen((v) => !v)}
                        className="text-gray-500 hover:text-blue-900 dark:text-gray-300 dark:hover:text-blue-300 text-2xl focus:outline-none transition-transform active:scale-95"
                    >
                        <FaBars />
                    </button>

                    <div className="flex items-center gap-2">
                        {isAdmin && <NotificationBell title={t('pendingRequests')} />}

                        <div className="relative">
                            <button
                                type="button"
                                className="h-9 px-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 flex items-center gap-1.5"
                                title={`${t('theme')}: ${t(theme)}`}
                                onClick={() => {
                                    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
                                    setTheme(next);
                                }}
                            >
                                {theme === 'light' ? <FaSun size={14} /> : theme === 'dark' ? <FaMoon size={14} /> : <FaDesktop size={14} />}
                                <span className="hidden lg:block text-[10px] font-bold uppercase">{theme === 'system' ? 'SYS' : theme}</span>
                            </button>
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                className="h-9 px-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 flex items-center gap-1.5"
                                title={`${t('language')}: ${language.toUpperCase()}`}
                                onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                            >
                                <FaGlobe size={14} />
                                <span className="hidden lg:block text-[10px] font-bold uppercase">{language}</span>
                            </button>
                        </div>

                        <div className="text-right hidden sm:block mr-2">
                            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{user?.nombre}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">{user?.roles?.[0] || t('userRoleFallback')}</p>
                        </div>

                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold border-2 border-white dark:border-slate-900 shadow-md">
                            {user?.nombre?.charAt(0) || 'U'}
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-6 lg:p-8 fade-in">
                    <Outlet />
                </main>
            </div>

            {sidebarVariant === 'sidebar-right' && (
                <Sidebar
                    isOpen={isSidebarOpen}
                    isMobile={isMobile}
                    toggleSidebar={() => setSidebarOpen((v) => !v)}
                    onClose={() => setSidebarOpen(false)}
                    logout={logout}
                />
            )}
        </div>
    );
};

export default DashboardLayout;

