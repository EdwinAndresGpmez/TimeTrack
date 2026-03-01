import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import * as FaIcons from 'react-icons/fa';
import { FaSignOutAlt, FaSyncAlt, FaChevronDown, FaChevronRight } from 'react-icons/fa';

const Sidebar = ({ isOpen, toggleSidebar, logout }) => {
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Rastrea qué categorías están abiertas/cerradas
    const [openCategories, setOpenCategories] = useState({});

    const [branding, setBranding] = useState({
        bg_color: '#0f172a',
        accent_color: '#34d399',
        variant: 'floating',
        logo_url: null,
        empresa_nombre: 'IDEFNOVA'
    });

    // Cargar branding y menú lo más rápido posible desde localStorage (optimista)
    useEffect(() => {
        const loadBrandingAndMenu = () => {
            const localBranding = localStorage.getItem('branding');
            const localMenu = localStorage.getItem('menuItems');
            if (localBranding) setBranding(JSON.parse(localBranding));
            if (localMenu) setMenuItems(JSON.parse(localMenu));
            setLoading(false);
        };
        loadBrandingAndMenu();
        // Escuchar cambios de branding en tiempo real
        const handler = () => {
            loadBrandingAndMenu();
        };
        window.addEventListener('brandingChanged', handler);
        return () => window.removeEventListener('brandingChanged', handler);
    }, []);

    useEffect(() => {
        const fetchBrandingAndMenu = async () => {
            if (!localStorage.getItem('token')) return;
            try {
                const [dataBranding, dataMenu] = await Promise.all([
                    authService.getBranding(),
                    authService.getMenu()
                ]);
                if (dataBranding) {
                    setBranding(dataBranding);
                    localStorage.setItem('branding', JSON.stringify(dataBranding));
                }
                if (dataMenu) {
                    setMenuItems(dataMenu);
                    localStorage.setItem('menuItems', JSON.stringify(dataMenu));
                    // Por defecto, todas las categorías inician comprimidas (cerradas)
                    const initialCats = {};
                    dataMenu.forEach(item => {
                        const cat = item.category_name || "General";
                        // Solo abrir si el usuario ya lo abrió en la sesión
                        initialCats[cat] = false;
                    });
                    setOpenCategories(initialCats);
                }
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchBrandingAndMenu();
    }, [user]);

    const toggleCategory = (catName) => {
        setOpenCategories(prev => {
            const updated = {
                ...prev,
                [catName]: !prev[catName]
            };
            // Guardar el estado de categorías abiertas en sessionStorage para persistir durante la sesión
            sessionStorage.setItem('sidebarOpenCategories', JSON.stringify(updated));
            return updated;
        });
    };

    // Al montar, restaurar el estado de categorías abiertas de sessionStorage
    useEffect(() => {
        const saved = sessionStorage.getItem('sidebarOpenCategories');
        if (saved) {
            setOpenCategories(JSON.parse(saved));
        }
    }, []);

    const getContrastColor = (hexcolor) => {
        if (!hexcolor) return '#ffffff';
        const r = parseInt(hexcolor.substr(1, 2), 16);
        const g = parseInt(hexcolor.substr(3, 2), 16);
        const b = parseInt(hexcolor.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1e293b' : '#f8fafc';
    };

    const textColor = getContrastColor(branding.bg_color);
    const renderIcon = (iconName) => {
        const IconComponent = FaIcons[iconName];
        return IconComponent ? <IconComponent /> : <FaIcons.FaCircle />;
    };

    const groups = menuItems.reduce((acc, item) => {
        const cat = item.category_name || "General";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    // TOPBAR VARIANTE
    // Solo compacto, eliminar minimalista
    let isCompact = branding.variant === 'compact';

    if (branding.variant === 'topbar') {
        return (
            <header
                style={{
                    backgroundColor: branding.bg_color,
                    color: textColor,
                    borderRadius: '0 0 2rem 2rem',
                    minHeight: 64,
                    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 2rem',
                }}
            >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden border border-white/10 mr-4">
                    {branding.logo_url ? <img src={branding.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <span className="font-black text-xl" style={{ color: branding.accent_color }}>{branding.empresa_nombre.substring(0, 2).toUpperCase()}</span>}
                </div>
                <h1 className="font-black tracking-tighter text-lg leading-tight truncate uppercase mr-8">{branding.empresa_nombre}</h1>
                {/* Menú horizontal */}
                <nav className="flex-1 flex gap-4 items-center">
                    {Object.keys(groups).map(cat => (
                        <div key={cat} className="relative group">
                            <button className="text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                                {cat}
                            </button>
                            <div className="absolute left-0 mt-2 bg-white/90 rounded-xl shadow-xl p-2 min-w-[160px] hidden group-hover:block z-50">
                                {groups[cat].map(item => (
                                    <Link key={item.id} to={item.url} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg">
                                        {renderIcon(item.icon)} <span className="ml-2">{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
                <button onClick={logout} className="ml-8 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
                    <FaSignOutAlt className="text-xl" />
                    <span className="font-bold text-sm">Cerrar Sesión</span>
                </button>
            </header>
        );
    }

    // SIDEBAR VARIANTES
    let sidebarPosition = 'left-0';
    let sidebarExtraClass = '';
    if (branding.variant === 'sidebar-right') sidebarPosition = 'right-0';
    if (branding.variant === 'compact') sidebarExtraClass = 'w-20'; // Aumentar ancho compacto
    if (branding.variant === 'glassmorphism') sidebarExtraClass = 'backdrop-blur-lg bg-white/30 border border-white/20';

    // Mejorar contraste en glassmorphism
    let menuTextColor = textColor;
    if (branding.variant === 'glassmorphism') menuTextColor = '#222';

    return (
        <aside
            style={{
                backgroundColor: branding.variant === 'glassmorphism' ? 'rgba(255,255,255,0.15)' : branding.bg_color,
                color: menuTextColor,
                borderRadius:
                    branding.variant === 'floating' ? '2rem'
                    : branding.variant === 'compact' ? '1.5rem'
                    : branding.variant === 'sidebar-right' ? '2rem 0 0 2rem'
                    : branding.variant === 'glassmorphism' ? '2rem' : '0px',
                boxShadow: branding.variant === 'glassmorphism' ? '0 8px 32px 0 rgba(31, 38, 135, 0.37)' : undefined,
                backdropFilter: branding.variant === 'glassmorphism' ? 'blur(8px)' : undefined,
                opacity: branding.variant === 'glassmorphism' ? 0.95 : 1
            }}
            className={`fixed z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shadow-2xl
                ${branding.variant === 'floating' ? 'top-4 bottom-4 left-4 border border-white/10' : `top-0 bottom-0 ${sidebarPosition}`}
                ${branding.variant === 'compact' ? sidebarExtraClass : isOpen ? 'w-72' : 'w-24'}
                ${branding.variant === 'sidebar-right' ? 'items-end' : ''}
                ${branding.variant === 'glassmorphism' ? sidebarExtraClass : ''}
            `}
        >
            {/* Cabecera */}
            <div className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5 overflow-hidden shadow-lg">
                    {branding.logo_url ? <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <span className="font-black text-xl" style={{ color: branding.accent_color }}>{branding.empresa_nombre.substring(0, 2).toUpperCase()}</span>}
                </div>
                <div className={`transition-all duration-500 ${!isOpen || branding.variant === 'compact' ? 'opacity-0 scale-0 w-0' : 'opacity-100'}`}>
                    <h1 className="font-black tracking-tighter text-lg leading-tight truncate uppercase">{branding.empresa_nombre}</h1>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Enterprise</p>
                </div>
            </div>

            {/* Navegación con Categorías Colapsables */}
            <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto no-scrollbar">
                {isCompact
                    ? Object.values(groups).flat().map(item => {
                        const active = location.pathname === item.url;
                        return (
                            <div key={item.id} className="relative group">
                                <Link
                                    to={item.url}
                                    className={`
                                        relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group
                                        ${active ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}
                                        justify-center
                                    `}
                                >
                                    <div className="text-xl transition-transform duration-300 group-hover:scale-110 shrink-0"
                                        style={{ color: active ? branding.accent_color : menuTextColor, opacity: active ? 1 : 0.6 }}>
                                        {renderIcon(item.icon)}
                                    </div>
                                    {active && (
                                        <div className="absolute right-2 w-1.5 h-6 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                                            style={{ backgroundColor: branding.accent_color }} />
                                    )}
                                </Link>
                                {/* Tooltip para nombre en modo compacto */}
                                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl transition-all">
                                    {item.label}
                                </span>
                            </div>
                        );
                    })
                    : Object.keys(groups).map(cat => {
                        const isExpanded = openCategories[cat];
                        return (
                            <div key={cat} className="space-y-1">
                                {/* BOTÓN DE CATEGORÍA (ACCORDEON) */}
                                <button
                                    onClick={() => isOpen && toggleCategory(cat)}
                                    className={`w-full flex items-center justify-between px-4 py-2 transition-all group
                                    ${!isOpen ? 'cursor-default' : 'cursor-pointer hover:bg-white/5 rounded-xl'}`}
                                >
                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-opacity duration-300
                                    ${!isOpen ? 'opacity-0' : 'opacity-40 group-hover:opacity-80'}`}>
                                        {cat}
                                    </p>
                                    {isOpen && (
                                        <div className="text-[10px] opacity-30 group-hover:opacity-100 transition-transform duration-300"
                                             style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                            <FaChevronDown />
                                        </div>
                                    )}
                                </button>

                                {/* CONTENEDOR DE ÍTEMS CON ANIMACIÓN */}
                                <div className={`space-y-1 transition-all duration-500 overflow-hidden 
                                    ${isExpanded || !isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {groups[cat].map(item => {
                                        const active = location.pathname === item.url;
                                        return (
                                            <div key={item.id} className="relative group">
                                                <Link
                                                    to={item.url}
                                                    className={`
                                                        relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group
                                                        ${active ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}
                                                        ${!isOpen ? 'justify-center' : ''}
                                                    `}
                                                >
                                                    <div className="text-xl transition-transform duration-300 group-hover:scale-110 shrink-0"
                                                        style={{ color: active ? branding.accent_color : menuTextColor, opacity: active ? 1 : 0.6 }}>
                                                        {renderIcon(item.icon)}
                                                    </div>
                                                    <span className={`text-sm font-bold transition-all duration-300 whitespace-nowrap
                                                        ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}
                                                        ${!isOpen ? 'opacity-0 w-0 pointer-events-none' : 'w-auto'}`}>
                                                        {item.label}
                                                    </span>
                                                    {active && (
                                                        <div className="absolute right-2 w-1.5 h-6 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                                                            style={{ backgroundColor: branding.accent_color }} />
                                                    )}
                                                </Link>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
            </nav>

            {/* Footer */}
            <div className={`p-4 border-t border-white/5 ${!isOpen || branding.variant === 'compact' ? 'flex flex-col items-center' : ''}`}>
                <button onClick={logout} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group hover:bg-red-500/10 hover:text-red-400 ${!isOpen || branding.variant === 'compact' ? 'justify-center' : ''}`}>
                    <FaSignOutAlt className="text-xl group-hover:translate-x-1 transition-transform opacity-60 group-hover:opacity-100" />
                    <span className={`font-bold text-sm transition-all ${!isOpen || branding.variant === 'compact' ? 'hidden' : 'block'}`}>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;