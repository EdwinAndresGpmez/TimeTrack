import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/portal/Navbar';
import Footer from '../../components/portal/Footer';
import { portalService } from '../../services/portalService';
import { FaBriefcaseMedical, FaCheckCircle, FaExclamationTriangle, FaPaperclip, FaSpinner } from 'react-icons/fa';

const TrabajeConNosotros = () => {
    const { tenantSlug } = useParams();
    const [blockedByPlan, setBlockedByPlan] = useState(false);
    const [checkingPolicy, setCheckingPolicy] = useState(true);
    const [formData, setFormData] = useState({
        nombre_completo: '',
        correo: '',
        telefono: '',
        perfil_profesional: '',
        archivo_hv: null,
        mensaje_adicional: '',
    });

    const [status, setStatus] = useState(null); // 'success' | 'error' | 'loading'

    const inputBase =
        'w-full rounded-2xl border border-slate-900/10 bg-white/70 backdrop-blur px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/40';
    const labelBase = 'block text-slate-700 font-extrabold text-sm mb-2';

    useEffect(() => {
        let mounted = true;
        const checkPolicy = async () => {
            try {
                const policy = await portalService.getPublicPolicy();
                const portalCompleto = Boolean(policy?.features?.portal_web_completo?.enabled);
                if (mounted) setBlockedByPlan(!portalCompleto);
            } catch (_err) {
                if (mounted) setBlockedByPlan(false);
            } finally {
                if (mounted) setCheckingPolicy(false);
            }
        };
        checkPolicy();
        return () => {
            mounted = false;
        };
    }, []);

    const isValidFile = useMemo(() => {
        if (!formData.archivo_hv) return true;
        const okTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        return okTypes.includes(formData.archivo_hv.type) || formData.archivo_hv.name?.toLowerCase().endswith('.pdf');
    }, [formData.archivo_hv]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        setFormData((prev) => ({ ...prev, archivo_hv: file }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.archivo_hv) {
            setStatus('error');
            return;
        }

        if (!isValidFile) {
            setStatus('error');
            return;
        }

        setStatus('loading');

        const dataToSend = new FormData();
        Object.keys(formData).forEach((key) => {
            if (formData[key]) dataToSend.append(key, formData[key]);
        });

        try {
            await portalService.createHV(dataToSend);

            setStatus('success');
            setFormData({
                nombre_completo: '',
                correo: '',
                telefono: '',
                perfil_profesional: '',
                archivo_hv: null,
                mensaje_adicional: '',
            });
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <>
            <Navbar tenantSlug={tenantSlug} portalWebCompletoEnabled={!blockedByPlan} />

            <div className="relative pt-24 md:pt-28 pb-16 overflow-hidden">
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute -top-56 -left-56 h-[720px] w-[720px] rounded-full bg-gradient-to-br from-sky-200/65 via-indigo-200/30 to-emerald-100/45 blur-3xl" />
                    <div className="absolute -bottom-72 -right-72 h-[820px] w-[820px] rounded-full bg-gradient-to-tr from-indigo-200/55 via-cyan-100/45 to-white/70 blur-3xl" />
                    <div
                        className="absolute inset-0 opacity-[0.06]"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, rgba(15,23,42,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.12) 1px, transparent 1px)',
                            backgroundSize: '64px 64px',
                        }}
                    />
                    <div className="absolute inset-0 bg-white/70" />
                </div>

                <div className="container mx-auto px-4 max-w-4xl">
                    {!checkingPolicy && blockedByPlan && (
                        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-50/80 backdrop-blur px-4 py-4 text-amber-900">
                            <div className="font-black">Trabaje con Nosotros no disponible en este plan</div>
                            <div className="text-sm">
                                Tu tenant está en modo <b>portal_citas_simple</b>. Esta funcionalidad requiere <b>portal_web_completo</b>.
                            </div>
                        </div>
                    )}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 backdrop-blur px-4 py-2 shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="uppercase tracking-widest text-[11px] md:text-xs font-black text-slate-700">
                                Trabaje con nosotros
                            </span>
                        </div>

                        <h1 className="mt-4 text-3xl md:text-4xl font-black text-slate-900">
                            Envíanos tu hoja de vida
                        </h1>

                        <p className="mt-3 text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            Queremos conocerte. Completa tus datos, el perfil al que aplicas y adjunta tu hoja de vida (PDF recomendado).
                        </p>
                    </div>
                    {status === 'success' && (
                        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-50/80 backdrop-blur px-4 py-4 text-emerald-800 flex items-start gap-3">
                            <div className="mt-0.5">
                                <FaCheckCircle className="text-emerald-600" />
                            </div>
                            <div>
                                <div className="font-black">¡Enviado!</div>
                                <div className="text-sm">
                                    Tu hoja de vida fue recibida correctamente. Te contactaremos si tu perfil avanza en el proceso.
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-50/80 backdrop-blur px-4 py-4 text-rose-800 flex items-start gap-3">
                            <div className="mt-0.5">
                                <FaExclamationTriangle className="text-rose-600" />
                            </div>
                            <div>
                                <div className="font-black">Revisa tu información</div>
                                <div className="text-sm">
                                    No se pudo enviar. Verifica que hayas adjuntado tu hoja de vida (PDF recomendado) e intenta de nuevo.
                                </div>
                            </div>
                        </div>
                    )}
                    {!blockedByPlan && <form
                        onSubmit={handleSubmit}
                        className="relative overflow-hidden rounded-3xl border border-slate-900/10 bg-white/65 backdrop-blur-xl shadow-[0_30px_80px_rgba(15,23,42,0.08)]"
                    >
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl" />
                            <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />
                        </div>

                        <div className="relative p-6 md:p-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelBase}>Nombre completo</label>
                                    <input
                                        type="text"
                                        name="nombre_completo"
                                        required
                                        value={formData.nombre_completo}
                                        onChange={handleChange}
                                        className={inputBase}
                                        placeholder="Ej: Juan David Gómez"
                                    />
                                </div>

                                <div>
                                    <label className={labelBase}>Correo electrónico</label>
                                    <input
                                        type="email"
                                        name="correo"
                                        required
                                        value={formData.correo}
                                        onChange={handleChange}
                                        className={inputBase}
                                        placeholder="tucorreo@dominio.com"
                                    />
                                </div>

                                <div>
                                    <label className={labelBase}>Teléfono</label>
                                    <input
                                        type="tel"
                                        name="telefono"
                                        required
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        className={inputBase}
                                        placeholder="Ej: 300 123 4567"
                                    />
                                </div>

                                <div>
                                    <label className={labelBase}>Perfil profesional</label>
                                    <input
                                        type="text"
                                        name="perfil_profesional"
                                        required
                                        value={formData.perfil_profesional}
                                        onChange={handleChange}
                                        className={inputBase}
                                        placeholder="Ej: Enfermera, Médico General, Contador"
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className={labelBase}>Mensaje adicional (opcional)</label>
                                <textarea
                                    name="mensaje_adicional"
                                    rows="4"
                                    value={formData.mensaje_adicional}
                                    onChange={handleChange}
                                    className={inputBase}
                                    placeholder="Cuéntanos sobre tu experiencia, disponibilidad o área de interés..."
                                />
                            </div>

                            <div className="mt-6">
                                <label className={labelBase}>Adjuntar hoja de vida</label>

                                <div className="rounded-2xl border border-slate-900/10 bg-white/60 backdrop-blur p-4 shadow-sm">
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <div className="h-10 w-10 rounded-2xl bg-white/70 border border-slate-900/10 flex items-center justify-center">
                                            <FaPaperclip />
                                        </div>

                                        <div className="flex-1">
                                            <div className="font-extrabold text-sm flex items-center gap-2">
                                                <FaBriefcaseMedical className="text-emerald-600" />
                                                Hoja de vida (PDF recomendado)
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Puedes adjuntar PDF (recomendado) o DOC/DOCX.
                                            </div>
                                        </div>

                                        <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-extrabold shadow-sm hover:opacity-90 transition">
                                            Seleccionar
                                            <input type="file" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>

                                    {formData.archivo_hv && (
                                        <div className="mt-3 text-sm text-slate-600">
                                            <span className="font-bold">Archivo:</span> {formData.archivo_hv.name}
                                        </div>
                                    )}

                                    {!isValidFile && formData.archivo_hv && (
                                        <div className="mt-2 text-xs text-rose-600 font-bold">
                                            Formato no recomendado. Sube un PDF o documento Word.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                                <div className="text-xs text-slate-500 leading-relaxed">
                                    Al enviar, autorizas el tratamiento de datos para fines de selección.
                                </div>

                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 text-white px-7 py-3 font-extrabold shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <FaSpinner className="animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar hoja de vida'
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>}
                </div>
            </div>

            <Footer tenantSlug={tenantSlug} portalWebCompletoEnabled={!blockedByPlan} />
        </>
    );
};

export default TrabajeConNosotros;

