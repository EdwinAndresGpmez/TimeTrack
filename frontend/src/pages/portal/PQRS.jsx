import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/portal/Navbar';
import Footer from '../../components/portal/Footer';
import { portalService } from '../../services/portalService';
import { FaCheckCircle, FaExclamationTriangle, FaPaperclip, FaSpinner } from 'react-icons/fa';

const PQRS = () => {
    const { tenantSlug } = useParams();
    const [blockedByPlan, setBlockedByPlan] = useState(false);
    const [checkingPolicy, setCheckingPolicy] = useState(true);
    const [formData, setFormData] = useState({
        tipo: 'PETICION',
        nombre_remitente: '',
        correo: '',
        telefono: '',
        asunto: '',
        mensaje: '',
        adjunto: null,
    });

    const [status, setStatus] = useState(null); // 'success' | 'error' | 'loading'

    const tipoLabel = useMemo(() => {
        const map = {
            PETICION: 'Petición',
            QUEJA: 'Queja',
            RECLAMO: 'Reclamo',
            SUGERENCIA: 'Sugerencia',
            FELICITACION: 'Felicitación',
        };
        return map[formData.tipo] || 'Solicitud';
    }, [formData.tipo]);

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setFormData((prev) => ({ ...prev, adjunto: e.target.files?.[0] || null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        const dataToSend = new FormData();
        Object.keys(formData).forEach((key) => {
            if (formData[key]) dataToSend.append(key, formData[key]);
        });

        try {
            await portalService.createPQRS(dataToSend);
            setStatus('success');
            setFormData({
                tipo: 'PETICION',
                nombre_remitente: '',
                correo: '',
                telefono: '',
                asunto: '',
                mensaje: '',
                adjunto: null,
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
                {/* Ambient background claro */}
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
                            <div className="font-black">PQRS no disponible en este plan</div>
                            <div className="text-sm">
                                Tu tenant está en modo <b>portal_citas_simple</b>. Esta funcionalidad requiere <b>portal_web_completo</b>.
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 backdrop-blur px-4 py-2 shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-indigo-400" />
                            <span className="uppercase tracking-widest text-[11px] md:text-xs font-black text-slate-700">
                                PQRS
                            </span>
                        </div>

                        <h1 className="mt-4 text-3xl md:text-4xl font-black text-slate-900">
                            Radicar {tipoLabel}
                        </h1>

                        <p className="mt-3 text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            Tu opinión es importante. Completa el formulario con la información necesaria y, si lo
                            deseas, adjunta un archivo como soporte.
                        </p>
                    </div>

                    {/* Status banners */}
                    {status === 'success' && (
                        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-50/80 backdrop-blur px-4 py-4 text-emerald-800 flex items-start gap-3">
                            <div className="mt-0.5">
                                <FaCheckCircle className="text-emerald-600" />
                            </div>
                            <div>
                                <div className="font-black">¡Recibido!</div>
                                <div className="text-sm">
                                    Tu solicitud ha sido radicada correctamente. Te contactaremos por correo si se
                                    requiere información adicional.
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
                                <div className="font-black">Ocurrió un error</div>
                                <div className="text-sm">No se pudo enviar la solicitud. Por favor intenta de nuevo.</div>
                            </div>
                        </div>
                    )}

                    {/* Form card */}
                    {!blockedByPlan && <form
                        onSubmit={handleSubmit}
                        className="relative overflow-hidden rounded-3xl border border-slate-900/10 bg-white/65 backdrop-blur-xl shadow-[0_30px_80px_rgba(15,23,42,0.08)]"
                    >
                        {/* internal halos */}
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl" />
                            <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl" />
                        </div>

                        <div className="relative p-6 md:p-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelBase}>Tipo de solicitud</label>
                                    <select
                                        name="tipo"
                                        value={formData.tipo}
                                        onChange={handleChange}
                                        className={inputBase}
                                    >
                                        <option value="PETICION">Petición</option>
                                        <option value="QUEJA">Queja</option>
                                        <option value="RECLAMO">Reclamo</option>
                                        <option value="SUGERENCIA">Sugerencia</option>
                                        <option value="FELICITACION">Felicitación</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelBase}>Nombre completo</label>
                                    <input
                                        type="text"
                                        name="nombre_remitente"
                                        required
                                        value={formData.nombre_remitente}
                                        onChange={handleChange}
                                        className={inputBase}
                                        placeholder="Ej: María Fernanda Pérez"
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
                                    <label className={labelBase}>Teléfono (opcional)</label>
                                    <input
                                        type="tel"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        className={inputBase}
                                        placeholder="Ej: 300 123 4567"
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className={labelBase}>Asunto</label>
                                <input
                                    type="text"
                                    name="asunto"
                                    required
                                    value={formData.asunto}
                                    onChange={handleChange}
                                    className={inputBase}
                                    placeholder="Ej: Solicitud de información"
                                />
                            </div>

                            <div className="mt-6">
                                <label className={labelBase}>Mensaje</label>
                                <textarea
                                    name="mensaje"
                                    required
                                    rows="5"
                                    value={formData.mensaje}
                                    onChange={handleChange}
                                    className={inputBase}
                                    placeholder="Cuéntanos tu petición, queja, reclamo o sugerencia..."
                                />
                            </div>

                            <div className="mt-6">
                                <label className={labelBase}>Adjuntar archivo (opcional)</label>

                                <div className="rounded-2xl border border-slate-900/10 bg-white/60 backdrop-blur p-4 shadow-sm">
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <div className="h-10 w-10 rounded-2xl bg-white/70 border border-slate-900/10 flex items-center justify-center">
                                            <FaPaperclip />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-extrabold text-sm">Soporte / evidencia</div>
                                            <div className="text-xs text-slate-500">
                                                PDF, imagen o documento (según tu necesidad).
                                            </div>
                                        </div>

                                        <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-extrabold shadow-sm hover:opacity-90 transition">
                                            Seleccionar
                                            <input type="file" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>

                                    {formData.adjunto && (
                                        <div className="mt-3 text-sm text-slate-600">
                                            <span className="font-bold">Archivo:</span> {formData.adjunto.name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                                <div className="text-xs text-slate-500 leading-relaxed">
                                    Al enviar, autorizas el tratamiento de datos para gestionar tu solicitud.
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
                                        'Enviar solicitud'
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

export default PQRS;
