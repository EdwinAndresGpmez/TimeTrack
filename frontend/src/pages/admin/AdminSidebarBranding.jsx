import React, { useRef } from 'react';
import { FaPalette, FaImage, FaLayerGroup, FaMagic, FaUpload, FaSyncAlt } from 'react-icons/fa';
import AnimatedActionButton from '../../components/system/AnimatedActionButton';

const AdminSidebarBranding = ({ brandingConfig, setBrandingConfig }) => {
    const fileInputRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setBrandingConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
        // Validar tamaño máximo (ej: 1MB antes de comprimir)
        if (file.size > 1024 * 1024) {
            return Swal.fire('Imagen muy pesada', 'Por favor sube un logo menor a 1MB', 'warning');
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.src = reader.result;
            img.onload = () => {
                // Crear un canvas para redimensionar el logo
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 200; // El sidebar no necesita más de 200px
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convertir a Base64 optimizado (WebP o JPEG)
                const optimizedBase64 = canvas.toDataURL('image/webp', 0.8);
                setBrandingConfig(prev => ({ ...prev, logo_url: optimizedBase64 }));
            };
        };
        reader.readAsDataURL(file);
    }
};
    // CALCULO DE CONTRASTE (Luminosidad)
    const getContrastColor = (hexcolor) => {
        if (!hexcolor || hexcolor.length < 6) return '#ffffff';
        const r = parseInt(hexcolor.substr(1, 2), 16);
        const g = parseInt(hexcolor.substr(3, 2), 16);
        const b = parseInt(hexcolor.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#1e293b' : '#f8fafc'; // Texto oscuro si fondo es claro
    };

    const textColor = getContrastColor(brandingConfig.bg_color);

    return (
        <div className="animate-fadeIn space-y-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg">
                    <FaMagic size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Estudio de Diseño Sidebar</h2>
                    <p className="text-sm text-gray-500 font-medium">Personalización avanzada de identidad visual.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                        {/* LOGO Y NOMBRE DE EMPRESA */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <FaImage className="text-blue-500" /> Logo y Nombre de Empresa
                            </h4>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    name="empresa_nombre"
                                    value={brandingConfig.empresa_nombre || ''}
                                    onChange={handleChange}
                                    placeholder="Nombre de la empresa"
                                    className="bg-gray-50 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500 outline-none mb-1"
                                />
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        name="logo_url"
                                        value={brandingConfig.logo_url || ''}
                                        onChange={handleChange}
                                        placeholder="URL del Logo o sube uno -->"
                                        className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                    <AnimatedActionButton
                                        type="button"
                                        onClick={() => fileInputRef.current.click()}
                                        icon={<FaUpload />}
                                        label="Subir Logo"
                                        sublabel="Logo"
                                        className="!bg-indigo-600 hover:!bg-indigo-700 !py-2 !px-4"
                                    />
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </div>
                            </div>
                        </div>

                        {/* COLORES */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Fondo Sidebar</label>
                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border">
                                    <input type="color" name="bg_color" value={brandingConfig.bg_color || '#0f172a'} onChange={handleChange} className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent" />
                                    <input type="text" name="bg_color" value={brandingConfig.bg_color || ''} onChange={handleChange} maxLength={9} placeholder="#0f172a" className="w-20 text-[10px] font-mono font-bold bg-transparent border-none outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Color Acento (Iconos)</label>
                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border">
                                    <input type="color" name="accent_color" value={brandingConfig.accent_color || '#34d399'} onChange={handleChange} className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent" />
                                    <input type="text" name="accent_color" value={brandingConfig.accent_color || ''} onChange={handleChange} maxLength={9} placeholder="#34d399" className="w-20 text-[10px] font-mono font-bold bg-transparent border-none outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* VARIANTES - AQUÍ DEFINIMOS LA DIFERENCIA REAL */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    {id: 'classic', label: 'Clásico (Recto)', desc: 'Sin bordes redondeados, pegado al lateral.'},
                                    {id: 'floating', label: 'Flotante (Curvo)', desc: 'Bordes redondeados y separado de los extremos.'},
                                    {id: 'sidebar-right', label: 'Sidebar Derecha', desc: 'Barra lateral fija a la derecha.'},
                                    {id: 'compact', label: 'Compacto', desc: 'Sidebar angosto, solo iconos y tooltip.'},
                                    {id: 'glassmorphism', label: 'Glassmorphism', desc: 'Efecto vidrio moderno y difuminado.'},
                                    {id: 'topbar', label: 'Menú Superior (Topbar)', desc: 'Menú horizontal en la parte superior.'}
                                ].map((variant) => (
                                    <button
                                        key={variant.id}
                                        type="button"
                                        onClick={() => setBrandingConfig({...brandingConfig, variant: variant.id})}
                                        className={`text-left p-4 rounded-2xl border-2 transition-all ${brandingConfig.variant === variant.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-50 bg-gray-50'}`}
                                    >
                                        <p className="text-sm font-black text-gray-800 uppercase">{variant.label}</p>
                                        <p className="text-[10px] text-gray-500">{variant.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PREVIEW DINÁMICO */}
                <div className="bg-slate-200 rounded-[3rem] p-12 border-8 border-white shadow-inner flex items-center justify-center">
                    {/* Preview dinámico según variante */}
                    {brandingConfig.variant === 'topbar' ? (
                        <div style={{
                            backgroundColor: brandingConfig.bg_color,
                            color: textColor,
                            borderRadius: '1.5rem',
                            width: '320px',
                            height: '70px',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 2rem',
                            boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)'
                        }}>
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden border border-white/10 mr-4">
                                {brandingConfig.logo_url ? <img src={brandingConfig.logo_url} className="w-full h-full object-cover" /> : "TT"}
                            </div>
                            <span className="font-black text-xs uppercase tracking-widest">TOPBAR PREVIEW</span>
                        </div>
                    ) : (
                        <div
                            style={{
                                backgroundColor: brandingConfig.bg_color,
                                borderRadius:
                                    brandingConfig.variant === 'floating' ? '2.5rem'
                                    : brandingConfig.variant === 'minimalist' ? '1.5rem'
                                    : brandingConfig.variant === 'sidebar-right' ? '2rem 0 0 2rem'
                                    : brandingConfig.variant === 'compact' ? '1rem'
                                    : brandingConfig.variant === 'glassmorphism' ? '2rem' : '0px',
                                color: textColor,
                                boxShadow: brandingConfig.variant === 'glassmorphism' ? '0 8px 32px 0 rgba(31, 38, 135, 0.37)' : undefined,
                                backdropFilter: brandingConfig.variant === 'glassmorphism' ? 'blur(8px)' : undefined,
                                border: brandingConfig.variant === 'glassmorphism' ? '1px solid rgba(255,255,255,0.18)' : undefined,
                                opacity: brandingConfig.variant === 'glassmorphism' ? 0.95 : 1
                            }}
                            className={`shadow-2xl transition-all duration-700 flex flex-col overflow-hidden h-[450px] ${
                                brandingConfig.variant === 'minimalist' ? 'w-20'
                                : brandingConfig.variant === 'sidebar-right' ? 'w-60 ml-20'
                                : brandingConfig.variant === 'compact' ? 'w-14'
                                : 'w-60'
                            }`}
                        >
                            <div className="p-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                                    {brandingConfig.logo_url ? <img src={brandingConfig.logo_url} className="w-full h-full object-cover" /> : "TT"}
                                </div>
                                <div className={`transition-all duration-500 ${brandingConfig.variant === 'minimalist' || brandingConfig.variant === 'compact' ? 'opacity-0 w-0' : 'opacity-100'}`}>
                                    <h1 className="font-black text-xs">PREVIEW</h1>
                                </div>
                            </div>
                            <div className="flex-1 px-4 space-y-4 pt-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center gap-4 p-2">
                                        <div className="w-5 h-5 rounded-lg shrink-0" style={{ backgroundColor: i === 1 ? brandingConfig.accent_color : textColor, opacity: i === 1 ? 1 : 0.2 }} />
                                        <div className={`h-2 bg-current rounded-full transition-all ${brandingConfig.variant === 'minimalist' || brandingConfig.variant === 'compact' ? 'w-0 opacity-0' : 'w-24 opacity-20'}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSidebarBranding;