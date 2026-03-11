import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { tenancyService } from '../../services/tenancyService';
import * as FaIcons from 'react-icons/fa';
import { FaSignOutAlt, FaChevronDown, FaBell } from 'react-icons/fa';
import { getActiveTenantId, setActiveTenantContext } from '../../utils/tenantContext';
import { useUI } from '../../context/UIContext';

const Sidebar = ({ isOpen, isMobile = false, onClose, logout }) => {
    const { t, td } = useUI();
    const location = useLocation();
    const { user, permissions } = useContext(AuthContext);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tenantOptions, setTenantOptions] = useState([]);
    const [activeTenantId, setActiveTenantId] = useState(() => getActiveTenantId());
    const [openCategories, setOpenCategories] = useState({});

    const [branding, setBranding] = useState({
        bg_color: '#0f172a',
        accent_color: '#34d399',
        variant: 'floating',
        logo_url: null,
        empresa_nombre: 'IDEFNOVA'
    });
    const isSaaSSuperAdmin = user?.is_superuser || (permissions?.roles || []).includes('SuperAdmin SaaS');
    const canOpenSaasTenants = (permissions?.codenames || []).includes('saas_tenants_admin');

    const tenantCacheKey = activeTenantId || user?.tenant_id || 'default';
    const brandingStorageKey = `branding_${tenantCacheKey}`;
    const menuStorageKey = `menuItems_${tenantCacheKey}`;
    useEffect(() => {
        const loadBrandingAndMenu = () => {
            const localBranding = localStorage.getItem(brandingStorageKey);
            const localMenu = localStorage.getItem(menuStorageKey);
            if (localBranding) setBranding(JSON.parse(localBranding));
            if (localMenu) setMenuItems(JSON.parse(localMenu));
            setLoading(false);
        };
        loadBrandingAndMenu();
        const handler = () => {
            loadBrandingAndMenu();
        };
        window.addEventListener('brandingChanged', handler);
        return () => window.removeEventListener('brandingChanged', handler);
    }, [brandingStorageKey, menuStorageKey]);

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
                    localStorage.setItem(brandingStorageKey, JSON.stringify(dataBranding));
                }
                if (dataMenu) {
                    setMenuItems(dataMenu);
                    localStorage.setItem(menuStorageKey, JSON.stringify(dataMenu));
                    const initialCats = {};
                    dataMenu.forEach(item => {
                        const cat = item.category_name || "General";
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
    }, [user, brandingStorageKey, menuStorageKey]);

    const toggleCategory = (catName) => {
        setOpenCategories(prev => {
            const updated = {
                ...prev,
                [catName]: !prev[catName]
            };
            sessionStorage.setItem('sidebarOpenCategories', JSON.stringify(updated));
            return updated;
        });
    };
    useEffect(() => {
        const saved = sessionStorage.getItem('sidebarOpenCategories');
        if (saved) {
            setOpenCategories(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        const loadTenants = async () => {
            if (!user) return;
            try {
                const memberships = await authService.getMisTenants();
                const list = Array.isArray(memberships) ? memberships : (memberships?.results || []);

                let options = list
                    .filter((x) => !!x.tenant_id)
                    .map((x) => ({
                        tenant_id: x.tenant_id,
                        tenant_slug: x.tenant_slug || null,
                        label: x.tenant_slug ? `${x.tenant_slug}` : `Tenant #${x.tenant_id}`,
                        is_default: !!x.is_default,
                    }));

                if ((user?.is_superuser || (permissions?.roles || []).includes('SuperAdmin SaaS')) && options.length < 2) {
                    try {
                        const t = await tenancyService.getTenants();
                        const tenants = Array.isArray(t) ? t : (t?.results || []);
                        if (tenants.length > 0) {
                            options = tenants.map((item) => ({
                                tenant_id: item.id,
                                tenant_slug: item.slug,
                                label: item.legal_name ? `${item.legal_name} (${item.slug})` : item.slug,
                                is_default: item.id === (user?.tenant_id || activeTenantId),
                            }));
                        }
                    } catch (_err) {
                    }
                }

                setTenantOptions(options);

                const preferred = options.find((x) => x.tenant_id === (activeTenantId || user?.tenant_id))
                    || options.find((x) => x.is_default)
                    || options[0];

                if (preferred) {
                    setActiveTenantId(preferred.tenant_id);
                    setActiveTenantContext({
                        tenantId: preferred.tenant_id,
                        tenantSlug: preferred.tenant_slug || null,
                    });
                }
            } catch (error) {
                console.error('Error cargando tenants del usuario:', error);
            }
        };

        loadTenants();
    }, [user, permissions, activeTenantId]);

    const onChangeTenant = async (e) => {
        const nextTenantId = parseInt(e.target.value, 10);
        if (Number.isNaN(nextTenantId) || !user) return;
        try {
            const selected = tenantOptions.find((x) => x.tenant_id === nextTenantId);
            const switched = await authService.switchTenant(nextTenantId, selected?.tenant_slug || null);
            setActiveTenantId(nextTenantId);
            setActiveTenantContext({
                tenantId: nextTenantId,
                tenantSlug: switched?.tenant_slug || selected?.tenant_slug || null,
            });
            window.location.reload();
        } catch (error) {
            console.error('Error cambiando tenant:', error);
        }
    };

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
    const normalizeCategory = (value) =>
        String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

    const groups = menuItems.reduce((acc, item) => {
        const cat = item.category_name || "General";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

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
                <nav className="flex-1 flex gap-4 items-center">
                    {Object.keys(groups).map(cat => (
                        <div key={cat} className="relative group">
                            <button className="text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                                {td(cat)}
                            </button>
                            <div className="absolute left-0 mt-2 bg-white/90 rounded-xl shadow-xl p-2 min-w-[160px] hidden group-hover:block z-50">
                                {groups[cat].map(item => (
                                    <Link key={item.id} to={item.url} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg">
                                        {renderIcon(item.icon)} <span className="ml-2">{td(item.label)}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
                <button onClick={logout} className="ml-8 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
                    <FaSignOutAlt className="text-xl" />
                    <span className="font-bold text-sm">{t('logout', 'Cerrar sesión')}</span>
                </button>
            </header>
        );
    }

    let sidebarPosition = 'left-0';
    let sidebarExtraClass = '';
    if (branding.variant === 'sidebar-right') sidebarPosition = 'right-0';
    if (branding.variant === 'compact') sidebarExtraClass = 'w-20';
    if (branding.variant === 'glassmorphism') sidebarExtraClass = 'backdrop-blur-lg bg-white/30 border border-white/20';

    let menuTextColor = textColor;
    if (branding.variant === 'glassmorphism') menuTextColor = '#222';

    return (
        <>
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px]"
                    onClick={onClose}
                    role="presentation"
                />
            )}
            <aside
                style={{
                    backgroundColor: branding.variant === 'glassmorphism' ? 'rgba(255,255,255,0.15)' : branding.bg_color,
                    color: menuTextColor,
                    borderRadius:
                        isMobile ? '0'
                        : branding.variant === 'floating' ? '2rem'
                        : branding.variant === 'compact' ? '1.5rem'
                        : branding.variant === 'sidebar-right' ? '2rem 0 0 2rem'
                        : branding.variant === 'glassmorphism' ? '2rem' : '0px',
                    boxShadow: branding.variant === 'glassmorphism' ? '0 8px 32px 0 rgba(31, 38, 135, 0.37)' : undefined,
                    backdropFilter: branding.variant === 'glassmorphism' ? 'blur(8px)' : undefined,
                    opacity: branding.variant === 'glassmorphism' ? 0.95 : 1
                }}
                className={`fixed z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shadow-2xl
                    ${isMobile ? 'top-0 bottom-0 left-0 w-72 max-w-[86vw]' : (branding.variant === 'floating' ? 'top-4 bottom-4 left-4 border border-white/10' : `top-0 bottom-0 ${sidebarPosition}`)}
                    ${!isMobile && (branding.variant === 'compact' ? sidebarExtraClass : isOpen ? 'w-72' : 'w-24')}
                    ${branding.variant === 'sidebar-right' ? 'items-end' : ''}
                    ${branding.variant === 'glassmorphism' ? sidebarExtraClass : ''}
                    ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
                `}
            >
            <div className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5 overflow-hidden shadow-lg">
                    {branding.logo_url ? <img src={branding.logo_url} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <span className="font-black text-xl" style={{ color: branding.accent_color }}>{branding.empresa_nombre.substring(0, 2).toUpperCase()}</span>}
                </div>
                <div className={`transition-all duration-500 ${!isOpen || branding.variant === 'compact' ? 'opacity-0 scale-0 w-0' : 'opacity-100'}`}>
                    <h1 className="font-black tracking-tighter text-lg leading-tight truncate uppercase">{branding.empresa_nombre}</h1>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{t('enterpriseLabel', 'Enterprise')}</p>
                    {isSaaSSuperAdmin && tenantOptions.length > 0 && (
                        <select
                            className="mt-2 w-full rounded-lg bg-white/10 border border-white/20 text-xs px-2 py-1 outline-none"
                            value={activeTenantId || ''}
                            onChange={onChangeTenant}
                        >
                            {tenantOptions.map((opt) => (
                                <option key={opt.tenant_id} value={opt.tenant_id}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto no-scrollbar">
                {isCompact
                    ? Object.values(groups).flat().map(item => {
                        const active = location.pathname === item.url;
                        return (
                            <div key={item.id} className="relative group">
                                <Link
                                    to={item.url}
                                    data-guide-route={item.url}
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
                                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl transition-all">
                                    {td(item.label)}
                                </span>
                            </div>
                        );
                    })
                    : Object.keys(groups).map(cat => {
                        const isExpanded = openCategories[cat];
                        return (
                            <div key={cat} className="space-y-1">
                                <button
                                    onClick={() => isOpen && toggleCategory(cat)}
                                    data-guide-category={normalizeCategory(cat)}
                                    className={`w-full flex items-center justify-between px-4 py-2 transition-all group
                                    ${!isOpen ? 'cursor-default' : 'cursor-pointer hover:bg-white/5 rounded-xl'}`}
                                >
                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-opacity duration-300
                                    ${!isOpen ? 'opacity-0' : 'opacity-40 group-hover:opacity-80'}`}>
                                        {td(cat)}
                                    </p>
                                    {isOpen && (
                                        <div className="text-[10px] opacity-30 group-hover:opacity-100 transition-transform duration-300"
                                             style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                            <FaChevronDown />
                                        </div>
                                    )}
                                </button>
                                <div className={`space-y-1 transition-all duration-500 overflow-hidden 
                                    ${isExpanded || !isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {groups[cat].map(item => {
                                        const active = location.pathname === item.url;
                                        return (
                                            <div key={item.id} className="relative group">
                                                <Link
                                                    to={item.url}
                                                    data-guide-route={item.url}
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
                                                        {td(item.label)}
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

            <div className={`p-4 border-t border-white/5 ${!isOpen || branding.variant === 'compact' ? 'flex flex-col items-center' : ''}`}>
                {isSaaSSuperAdmin && canOpenSaasTenants && (
                    <Link
                        to="/dashboard/admin/tenants?tab=notifications"
                        className={`w-full mb-2 flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-blue-500/10 hover:text-blue-300 ${!isOpen || branding.variant === 'compact' ? 'justify-center' : ''}`}
                        title={t('saasNotifications', 'Notificaciones SaaS')}
                    >
                        <FaBell className="text-lg opacity-70" />
                        <span className={`font-bold text-xs transition-all ${!isOpen || branding.variant === 'compact' ? 'hidden' : 'block'}`}>{t('saasNotifications', 'Notificaciones SaaS')}</span>
                    </Link>
                )}
                <button onClick={logout} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group hover:bg-red-500/10 hover:text-red-400 ${!isOpen || branding.variant === 'compact' ? 'justify-center' : ''}`}>
                    <FaSignOutAlt className="text-xl group-hover:translate-x-1 transition-transform opacity-60 group-hover:opacity-100" />
                    <span className={`font-bold text-sm transition-all ${!isOpen || branding.variant === 'compact' ? 'hidden' : 'block'}`}>{t('logout', 'Cerrar sesión')}</span>
                </button>
            </div>
            </aside>
        </>
    );
};

export default Sidebar;


