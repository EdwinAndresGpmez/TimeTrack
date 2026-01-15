import React from 'react';
import { Link, useLocation } from 'react-router-dom';
// 👇 AGREGA 'FaCogs' AQUÍ EN ESTA LÍNEA
import { FaHome, FaCalendarAlt, FaUserMd, FaHistory, FaSignOutAlt, FaCogs } from 'react-icons/fa';

const Sidebar = ({ isOpen, logout }) => {
    const location = useLocation();

    const menuItems = [
        { path: '/dashboard', label: 'Inicio', icon: <FaHome /> },
        { path: '/dashboard/citas', label: 'Mis Citas', icon: <FaCalendarAlt /> },
        { path: '/dashboard/historia', label: 'Historia Clínica', icon: <FaHistory /> },
        { path: '/dashboard/perfil', label: 'Mi Perfil', icon: <FaUserMd /> },
        // Ahora sí funcionará este icono porque ya lo importamos arriba
        { path: '/dashboard/configuracion', label: 'Configuración', icon: <FaCogs /> }, 
    ];

    return (
        <div className={`
            fixed top-0 left-0 h-full bg-blue-900 text-white transition-all duration-300 z-50
            ${isOpen ? 'w-64' : 'w-20'} 
            hidden md:flex flex-col shadow-xl
        `}>
            {/* ... El resto del código sigue igual ... */}
            
            {/* Logo Area */}
            <div className="h-20 flex items-center justify-center border-b border-blue-800">
                <span className={`font-bold text-xl ${!isOpen && 'hidden'}`}>TimeTrack</span>
                <span className={`${isOpen && 'hidden'} font-bold text-xl`}>TT</span>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 py-6 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`
                            flex items-center px-6 py-3 transition-colors
                            ${location.pathname === item.path 
                                ? 'bg-blue-800 border-r-4 border-green-400' 
                                : 'hover:bg-blue-800'}
                        `}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className={`ml-4 font-medium ${!isOpen && 'hidden'}`}>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Logout Button */}
            <button 
                onClick={logout}
                className="p-4 flex items-center hover:bg-red-600 transition-colors border-t border-blue-800"
            >
                <FaSignOutAlt className="text-xl" />
                <span className={`ml-4 font-medium ${!isOpen && 'hidden'}`}>Cerrar Sesión</span>
            </button>
        </div>
    );
};

export default Sidebar;