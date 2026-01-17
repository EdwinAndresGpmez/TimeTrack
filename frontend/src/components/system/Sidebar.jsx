import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { 
    FaHome, FaCalendarAlt, FaUserMd, FaHistory, FaSignOutAlt, 
    FaCogs, FaUserCheck, FaNotesMedical, FaStethoscope, FaChartBar, FaCalendarCheck
} from 'react-icons/fa';

// Mapa de Iconos: Asocia el string de la BD con el componente real
// Si agregas nuevos iconos en el admin, asegúrate de importarlos y ponerlos aquí.
const iconMap = {
    'FaHome': <FaHome />,
    'FaCalendarAlt': <FaCalendarAlt />,
    'FaUserMd': <FaUserMd />,
    'FaHistory': <FaHistory />,
    'FaCogs': <FaCogs />,
    'FaUserCheck': <FaUserCheck />,
    'FaNotesMedical': <FaNotesMedical />,
    'FaStethoscope': <FaStethoscope />,
    'FaChartBar': <FaChartBar />,
    'FaCalendarCheck': <FaCalendarCheck />
};

const Sidebar = ({ isOpen, logout }) => {
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMenu = async () => {
            // SEGURIDAD EXTRA: Si no hay token, ni intentes llamar
            if (!localStorage.getItem('token')) {
                setLoading(false);
                return;
            }

            try {
                const items = await authService.getMenu();
                setMenuItems(items);
            } catch (error) {
                // Si es 401, el interceptor ya lo manejará, aquí solo evitamos que rompa la UI
                console.error("No se pudo cargar el menú dinámico."); 
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchMenu();
        }
    }, [user]);
    
    // Función auxiliar para renderizar el icono o uno por defecto
    const renderIcon = (iconName) => {
        return iconMap[iconName] || <FaHome />; // Default si no encuentra el nombre
    };

    return (
        <div className={`
            fixed top-0 left-0 h-full bg-blue-900 text-white transition-all duration-300 z-50
            ${isOpen ? 'w-64' : 'w-20'} 
            hidden md:flex flex-col shadow-xl
        `}>
            
            {/* Logo Area */}
            <div className="h-20 flex items-center justify-center border-b border-blue-800">
                <span className={`font-bold text-xl ${!isOpen && 'hidden'} tracking-wider`}>TimeTrack</span>
                <span className={`${isOpen && 'hidden'} font-bold text-xl`}>TT</span>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-700">
                
                {loading ? (
                    <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                ) : (
                    menuItems.map((item) => (
                        <Link
                            key={item.id || item.url} // Usar ID de base de datos si es posible
                            to={item.url}
                            className={`
                                flex items-center px-6 py-3 transition-colors
                                ${location.pathname === item.url 
                                    ? 'bg-blue-800 border-r-4 border-green-400' 
                                    : 'hover:bg-blue-800'}
                            `}
                        >
                            <span className="text-xl text-blue-200 group-hover:text-white">
                                {renderIcon(item.icon)}
                            </span>
                            <span className={`ml-4 font-medium truncate ${!isOpen && 'hidden'}`}>
                                {item.label}
                            </span>
                        </Link>
                    ))
                )}

                {/* Si no hay items (ej: error o usuario nuevo sin roles), mostrar mensaje sutil */}
                {!loading && menuItems.length === 0 && (
                    <div className={`px-6 py-4 text-sm text-blue-300 ${!isOpen && 'hidden'}`}>
                        Sin opciones disponibles
                    </div>
                )}

            </nav>

            {/* User Info Compacto (Opcional) */}
            <div className={`border-t border-blue-800 p-4 ${!isOpen && 'hidden'}`}>
                <p className="text-xs text-blue-300">Conectado como:</p>
                <p className="text-sm font-bold truncate">{user?.nombre || 'Usuario'}</p>
            </div>

            {/* Logout Button */}
            <button 
                onClick={logout}
                className="p-4 flex items-center hover:bg-red-600 transition-colors border-t border-blue-800 group"
            >
                <FaSignOutAlt className="text-xl group-hover:rotate-180 transition-transform duration-300" />
                <span className={`ml-4 font-medium ${!isOpen && 'hidden'}`}>Cerrar Sesión</span>
            </button>
        </div>
    );
};

export default Sidebar;