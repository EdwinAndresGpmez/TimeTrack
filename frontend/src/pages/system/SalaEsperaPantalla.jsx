import React, { useState, useEffect } from 'react';
import { citasService } from '../../services/citasService';
import { FaHospital, FaVolumeUp, FaUserClock, FaUserMd, FaMousePointer } from 'react-icons/fa';

const SalaEsperaPantalla = () => {
    const [citas, setCitas] = useState([]);
    const [ultimoLlamado, setUltimoLlamado] = useState(null);
    const [reloj, setReloj] = useState(new Date());
    const [audioActivado, setAudioActivado] = useState(false);

    // 1. Reloj de cabecera
    useEffect(() => {
        const t = setInterval(() => setReloj(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // 2. Carga de Datos y Polling
    useEffect(() => {
        const cargarLlamados = async () => {
            try {
                // CORRECCIÓN 1: Obtener fecha local exacta (Evita desfase UTC)
                const hoyLocal = new Date();
                const offset = hoyLocal.getTimezoneOffset();
                const fechaQuery = new Date(hoyLocal.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

                const data = await citasService.getAll({ fecha: fechaQuery });
                const lista = Array.isArray(data) ? data : (data.results || []);
                
                // Debug en consola para verificar qué llega
                console.log(`📺 Pantalla Sala - Fecha: ${fechaQuery} - Citas recibidas:`, lista.length);

                const llamados = lista.filter(c => c.estado === 'LLAMADO');
                const enEspera = lista.filter(c => ['EN_SALA', 'LLAMADO'].includes(c.estado));

                setCitas(enEspera);

                if (llamados.length > 0) {
                    const actual = llamados[0]; // Tomamos el más reciente
                    
                    if (!ultimoLlamado || ultimoLlamado.id !== actual.id) {
                        console.log("🔔 ¡NUEVO LLAMADO DETECTADO!", actual.paciente_nombre);
                        hablar(actual);
                        setUltimoLlamado(actual);
                    }
                }
            } catch (error) { 
                console.error("❌ Error de conexión en sala:", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    window.location.reload(); 
                }
            }
        };

        cargarLlamados();
        const interval = setInterval(cargarLlamados, 6000); 
        return () => clearInterval(interval);
    }, [ultimoLlamado]);

    // 3. Síntesis de Voz
    const hablar = (cita) => {
        if (!window.speechSynthesis || !audioActivado) return;
        
        window.speechSynthesis.cancel();
        const texto = `Atención por favor. Paciente ${cita.paciente_nombre}, favor dirigirse al consultorio del doctor ${cita.profesional_nombre}`;
        const msg = new SpeechSynthesisUtterance(texto);
        msg.lang = 'es-ES';
        msg.rate = 0.85;
        msg.pitch = 1;
        window.speechSynthesis.speak(msg);
    };

    return (
        <div className="h-screen w-full bg-[#0f172a] text-white overflow-hidden flex flex-col p-10 font-sans relative">
            
            {/* AVISO DE INTERACCIÓN (Para habilitar sonido) */}
            {!audioActivado && (
                <div 
                    onClick={() => setAudioActivado(true)}
                    className="absolute inset-0 z-[100] bg-blue-600/95 flex flex-col items-center justify-center cursor-pointer animate-fadeIn"
                >
                    <FaMousePointer size={80} className="mb-6 animate-bounce" />
                    <h2 className="text-5xl font-black uppercase">Haz clic para iniciar</h2>
                    <p className="text-xl mt-4 opacity-80">El sistema requiere interacción para activar el audio de los llamados.</p>
                </div>
            )}

            {/* HEADER SUPERIOR */}
            <div className="flex justify-between items-center mb-16">
                <div className="flex items-center gap-6">
                    <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-2xl shadow-blue-500/20">
                        <FaHospital size={50} />
                    </div>
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter uppercase leading-none text-white">Módulo de Sala</h1>
                        <p className="text-blue-400 font-bold text-xl mt-2 tracking-[0.3em] uppercase">Gestión de Turnos</p>
                    </div>
                </div>
                
                <div className="text-right bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700 min-w-[250px] shadow-inner">
                    <div className="text-7xl font-black font-mono leading-none text-blue-400">
                        {reloj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm text-slate-400 font-black uppercase mt-2 tracking-widest">
                        {reloj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </div>
                </div>
            </div>

            {/* CUERPO PRINCIPAL */}
            <div className="grid grid-cols-12 gap-10 flex-1">
                
                {/* ÁREA DE LLAMADO ACTUAL */}
                <div className="col-span-8 flex flex-col justify-center items-center bg-gradient-to-br from-blue-700 to-indigo-900 rounded-[5rem] shadow-[0_0_100px_rgba(37,99,235,0.2)] border-4 border-blue-500/30 p-16 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><FaVolumeUp size={200}/></div>
                    
                    <span className="text-3xl font-black uppercase text-blue-200 mb-8 tracking-[0.5em] animate-pulse">
                        Llamando a:
                    </span>
                    
                    <h2 className="text-[7.5rem] font-black text-center leading-[0.9] uppercase drop-shadow-2xl mb-12">
                        {ultimoLlamado ? ultimoLlamado.paciente_nombre : "Espere su turno"}
                    </h2>
                    
                    {ultimoLlamado && (
                        <div className="bg-white text-blue-800 px-16 py-6 rounded-[3rem] text-4xl font-black uppercase shadow-2xl flex items-center gap-6">
                            <FaUserMd className="text-blue-500" />
                            Dr. {ultimoLlamado.profesional_nombre}
                        </div>
                    )}
                </div>

                {/* LISTA LATERAL DE SIGUIENTES */}
                <div className="col-span-4 bg-slate-800/30 rounded-[4rem] p-10 border border-slate-700/50 flex flex-col shadow-inner">
                    <div className="flex items-center gap-3 mb-10 border-b border-slate-700 pb-6">
                        <FaUserClock className="text-slate-400" size={30} />
                        <h3 className="text-3xl font-black text-slate-400 uppercase tracking-tighter">Siguientes:</h3>
                    </div>
                    
                    <div className="space-y-6 overflow-hidden">
                        {citas.filter(c => c.estado !== 'LLAMADO').slice(0, 5).map(c => (
                            <div 
                                key={c.id} 
                                className="flex justify-between items-center bg-slate-800/80 p-8 rounded-[2.5rem] border border-slate-700 transform transition-all duration-700 animate-slideIn"
                            >
                                <span className="text-3xl font-black text-slate-500 font-mono">
                                    {c.hora_inicio.slice(0,5)}
                                </span>
                                <span className="text-3xl font-black uppercase truncate ml-6 text-slate-200">
                                    {c.paciente_nombre.split(' ')[0]} {c.paciente_nombre.split(' ')[1] || ''}
                                </span>
                            </div>
                        ))}
                        
                        {citas.length <= 1 && !ultimoLlamado && (
                            <div className="py-20 text-center opacity-20">
                                <FaUserClock size={80} className="mx-auto mb-4" />
                                <p className="text-xl font-bold uppercase">Sin turnos activos</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-10 text-center">
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] opacity-50">
                            Por favor esté atento al llamado por voz
                        </p>
                    </div>
                </div>

            </div>
            
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slideIn {
                    animation: slideIn 0.5s ease-out forwards;
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-in forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default SalaEsperaPantalla;