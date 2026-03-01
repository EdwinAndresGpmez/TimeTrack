import React, { useState, useContext, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom'; 
import { AuthContext } from '../../context/AuthContext'; 
import Sidebar from './Sidebar'; 
import { FaBars, FaBell } from 'react-icons/fa';
import DataUpdateEnforcer from './DataUpdateEnforcer'; 
import { patientService } from '../../services/patientService';

// --- COMPONENTE INTERNO DE CAMPANA (CORREGIDO) ---
const NotificationBell = () => {
    const [count, setCount] = useState(0);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        // Definimos la función DENTRO del efecto para evitar advertencias de dependencias
        const checkNotifications = async () => {
            try {
                const pendientes = await patientService.getSolicitudesPendientes();
                const nuevos = Array.isArray(pendientes) ? pendientes.length : 0;
                
                // Usamos el callback (prevCount) para tener siempre el valor real
                // y evitar el problema de "stale closure" dentro del setInterval
                setCount(prevCount => {
                    if (nuevos > prevCount) {
                        setAnimate(true);
                        setTimeout(() => setAnimate(false), 1000); 
                    }
                    return nuevos;
                });
            } catch (error) {
                console.error("Error check notificaciones", error);
            }
        };

        // 1. Llamada inicial
        checkNotifications();

        // 2. Intervalo (Polling)
        const interval = setInterval(checkNotifications, 30000); 
        
        // 3. Limpieza
        return () => clearInterval(interval);
    }, []); // Array vacío correcto: no dependemos de nada externo

    return (
        <Link 
            to="/dashboard/admin/validar-usuarios" 
            className="relative p-2 mr-6 text-gray-400 hover:text-blue-600 transition-colors group"
            title="Solicitudes Pendientes"
        >
            <FaBell className={`text-xl group-hover:text-blue-600 transition-colors ${animate ? 'animate-swing text-blue-600' : ''}`} />
            
            {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md animate-pulse border-2 border-white">
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
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    // Verificar si es admin para mostrar campana
    const isAdmin = user?.is_superuser || user?.is_staff || user?.roles?.includes('Administrador');

    // Detectar variante de sidebar para desplazar contenido correctamente
    let sidebarBranding = JSON.parse(localStorage.getItem('branding') || '{}');
    let sidebarVariant = sidebarBranding.variant || 'floating';
    let sidebarWidth = isSidebarOpen ? 288 : 96; // w-72 o w-24 en px
    if (sidebarVariant === 'compact') sidebarWidth = 80; // w-20
    if (sidebarVariant === 'sidebar-right') sidebarWidth = isSidebarOpen ? 288 : 96;

    // Forzar re-render del layout al cambiar la variante del sidebar
    const [sidebarKey, setSidebarKey] = useState(sidebarVariant);
    useEffect(() => { setSidebarKey(sidebarVariant); }, [sidebarVariant]);

    // Para topbar, altura fija
    let topbarHeight = sidebarVariant === 'topbar' ? 70 : 0;

    return (
        <div className="min-h-screen bg-gray-50 flex" key={sidebarKey}>
            <DataUpdateEnforcer />
            {/* Sidebar o Topbar */}
            {sidebarVariant !== 'sidebar-right' && <Sidebar isOpen={isSidebarOpen} logout={logout} />}
            <div
                className={`flex-1 transition-all duration-300 ${sidebarVariant === 'sidebar-right' ? 'order-1' : ''}`}
                style={{
                    marginLeft: sidebarVariant !== 'topbar' && sidebarVariant !== 'sidebar-right' ? sidebarWidth : 0,
                    marginRight: sidebarVariant === 'sidebar-right' ? sidebarWidth : 0,
                    minHeight: '100vh',
                    paddingTop: topbarHeight
                }}
            >
                <header className="bg-white shadow-sm h-20 flex items-center justify-between px-8 sticky top-0 z-40 backdrop-blur-md bg-white/90">
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="text-gray-500 hover:text-blue-900 text-2xl focus:outline-none transition-transform active:scale-95"
                    >
                        <FaBars />
                    </button>
                    <div className="flex items-center gap-2">
                        {isAdmin && <NotificationBell />}
                        <div className="text-right hidden sm:block mr-2">
                            <p className="font-bold text-gray-800 text-sm">{user?.nombre}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{user?.roles?.[0] || 'Usuario'}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-md">
                            {user?.nombre?.charAt(0) || 'U'}
                        </div>
                    </div>
                </header>
                <main className="p-8 fade-in">
                    <Outlet />
                </main>
            </div>
            {/* Sidebar derecho */}
            {sidebarVariant === 'sidebar-right' && <Sidebar isOpen={isSidebarOpen} logout={logout} />}
        </div>
    );
};

export default DashboardLayout;