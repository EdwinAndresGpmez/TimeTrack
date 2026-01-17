import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffService } from '../../services/staffService';
import { citasService } from '../../services/citasService';
import { patientService } from '../../services/patientService';
import { agendaService } from '../../services/agendaService';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { FaCalendarCheck, FaUserMd, FaHospital, FaStethoscope, FaSave, FaClock, FaSpinner } from 'react-icons/fa';

const NuevaCita = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    // Estados de datos
    const [servicios, setServicios] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    
    // Estados de Slots
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    
    // --- NUEVO: Estado para guardar la duración del servicio seleccionado ---
    const [duracionServicio, setDuracionServicio] = useState(30); // Default 30 por seguridad

    // Estado Formulario
    const [formData, setFormData] = useState({
        servicio_id: '', profesional_id: '', lugar_id: '', 
        fecha: '', hora_inicio: '', nota: ''
    });

    const [pacienteRealId, setPacienteRealId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(true);

    // 1. Carga Inicial
    useEffect(() => {
        const iniciarSistema = async () => {
            try {
                const perfil = await patientService.getMyProfile(user.user_id);
                if (!perfil) {
                    Swal.fire({ title: 'Atención', text: 'Completa tu perfil médico primero.', icon: 'warning' })
                        .then(() => navigate('/dashboard'));
                    return;
                }
                setPacienteRealId(perfil.id);

                const [servData, lugData] = await Promise.all([
                    staffService.getServicios({ activo: true }),
                    staffService.getLugares({ activo: true })
                ]);
                setServicios(servData);
                setLugares(lugData);
            } catch (err) { console.error(err); } 
            finally { setCheckingProfile(false); }
        };
        iniciarSistema();
    }, []);

    // 2. Efecto: Cuando cambia Fecha o Profesional -> Buscar Slots
    useEffect(() => {
        const fetchSlots = async () => {
            setSlots([]);
            setFormData(prev => ({ ...prev, hora_inicio: '' }));

            if (formData.profesional_id && formData.fecha && formData.servicio_id) {
                setLoadingSlots(true);
                try {
                    // --- CORRECCIÓN: Usamos la duración dinámica del servicio ---
                    const disponibles = await agendaService.getSlots(
                        formData.profesional_id, 
                        formData.fecha, 
                        duracionServicio // <--- Aquí pasamos 20, 30, 40 según corresponda
                    );
                    setSlots(disponibles);
                } catch (error) {
                    console.error("Error cargando slots", error);
                } finally {
                    setLoadingSlots(false);
                }
            }
        };

        fetchSlots();
    }, [formData.profesional_id, formData.fecha, formData.servicio_id, duracionServicio]);

    // Handlers
    const handleServiceChange = async (e) => {
        const id = e.target.value;
        
        // Buscamos el objeto servicio completo para sacar la duración
        const servicioSeleccionado = servicios.find(s => s.id === parseInt(id));
        const duracion = servicioSeleccionado ? servicioSeleccionado.duracion_minutos : 30;
        setDuracionServicio(duracion);

        setFormData(prev => ({ ...prev, servicio_id: id, profesional_id: '', hora_inicio: '' }));
        
        if (id) {
            // Buscamos médicos activos y que estén habilitados para este servicio
            const profs = await staffService.getProfesionales({ 
                servicios_habilitados: id, 
                activo: true 
            });
            setProfesionales(profs);
        } else {
            setProfesionales([]);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await citasService.create({
                usuario_id: user.user_id,
                paciente_id: pacienteRealId,
                servicio_id: formData.servicio_id,
                profesional_id: formData.profesional_id,
                lugar_id: formData.lugar_id,
                fecha: formData.fecha,
                hora_inicio: formData.hora_inicio,
                // Calculamos la hora fin sumando la duración real del servicio
                hora_fin: sumarMinutos(formData.hora_inicio, duracionServicio), 
                nota: formData.nota
            });
            await Swal.fire('¡Cita Agendada!', 'Nos vemos en la consulta.', 'success');
            navigate('/dashboard/citas');
        } catch (error) {
            Swal.fire('Error', 'No se pudo agendar. Verifica tu conexión.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const sumarMinutos = (hora, minutos) => {
        if (!hora) return '';
        const [h, m] = hora.split(':').map(Number);
        const d = new Date(); 
        d.setHours(h, m + minutos);
        return d.toTimeString().slice(0, 5);
    };

    if (checkingProfile) return <div className="p-10 text-center">Validando perfil...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-blue-900 mb-6">Agendar Nueva Cita</h1>
            
            <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-xl p-8 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. SELECCIÓN DE SERVICIO */}
                <div className="md:col-span-2">
                    <label className="block text-gray-700 font-bold mb-2"><FaStethoscope className="inline mr-2 text-blue-500"/>¿Qué necesitas?</label>
                    <select name="servicio_id" value={formData.servicio_id} onChange={handleServiceChange} required className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Selecciona un servicio...</option>
                        {servicios.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.nombre} - ${s.precio_base} (Duración: {s.duracion_minutos} min)
                            </option>
                        ))}
                    </select>
                </div>

                {/* 2. PROFESIONAL */}
                <div>
                    <label className="block text-gray-700 font-bold mb-2"><FaUserMd className="inline mr-2 text-blue-500"/>Especialista</label>
                    <select name="profesional_id" value={formData.profesional_id} onChange={handleChange} required disabled={!formData.servicio_id} className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100">
                        <option value="">Selecciona médico...</option>
                        {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                </div>

                {/* 3. SEDE */}
                <div>
                    <label className="block text-gray-700 font-bold mb-2"><FaHospital className="inline mr-2 text-blue-500"/>Sede</label>
                    <select name="lugar_id" value={formData.lugar_id} onChange={handleChange} required className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Selecciona sede...</option>
                        {lugares.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                    </select>
                </div>

                {/* 4. FECHA */}
                <div>
                    <label className="block text-gray-700 font-bold mb-2"><FaCalendarCheck className="inline mr-2 text-blue-500"/>Fecha Deseada</label>
                    <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} min={new Date().toISOString().split('T')[0]} required className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"/>
                </div>

                {/* 5. SELECCIÓN DE HORA (SLOTS DINÁMICOS) */}
                <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <label className="block text-blue-900 font-bold mb-3 flex items-center gap-2">
                        <FaClock/> Horarios Disponibles 
                        {duracionServicio > 0 && <span className="text-xs font-normal text-blue-600 bg-blue-200 px-2 py-0.5 rounded ml-2">Intervalos de {duracionServicio} min</span>}
                        {loadingSlots && <FaSpinner className="animate-spin ml-auto"/>}
                    </label>
                    
                    {!formData.profesional_id || !formData.fecha ? (
                        <p className="text-sm text-gray-500 italic">Selecciona un médico y una fecha para ver disponibilidad.</p>
                    ) : slots.length === 0 && !loadingSlots ? (
                        <div className="text-red-500 font-medium text-sm">No hay agenda disponible para este día. Intenta otra fecha.</div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                            {slots.map(hora => (
                                <button
                                    key={hora}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, hora_inicio: hora })}
                                    className={`
                                        py-2 px-1 rounded text-sm font-bold transition
                                        ${formData.hora_inicio === hora 
                                            ? 'bg-blue-600 text-white shadow-lg scale-105' 
                                            : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:text-blue-600'}
                                    `}
                                >
                                    {hora}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Input oculto para validación HTML5 */}
                    <input type="text" value={formData.hora_inicio} required className="opacity-0 h-0 w-0" />
                </div>

                {/* 6. NOTA */}
                <div className="md:col-span-2">
                    <label className="block text-gray-700 font-bold mb-2">Observaciones</label>
                    <textarea name="nota" value={formData.nota} onChange={handleChange} rows="2" className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Opcional..."></textarea>
                </div>

                {/* BOTÓN */}
                <div className="md:col-span-2 flex justify-end">
                    <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-10 rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105 disabled:opacity-50">
                        {loading ? 'Procesando...' : <><FaSave /> Confirmar Cita</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NuevaCita;