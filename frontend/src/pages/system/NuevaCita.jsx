import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffService } from '../../services/staffService';
import { citasService } from '../../services/citasService';
import { patientService } from '../../services/patientService';
import { agendaService } from '../../services/agendaService';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { FaCalendarCheck, FaUserMd, FaHospital, FaStethoscope, FaSave, FaClock, FaSpinner, FaInfoCircle } from 'react-icons/fa';

const NuevaCita = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [servicios, setServicios] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [duracionServicio, setDuracionServicio] = useState(30); 

    const [formData, setFormData] = useState({
        servicio_id: '', profesional_id: '', lugar_id: '', 
        fecha: '', hora_inicio: '', nota: ''
    });

    const [pacienteRealId, setPacienteRealId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(true);

    // 1. CARGA INICIAL Y FILTRADO ESTRICTO
    useEffect(() => {
        const iniciarSistema = async () => {
            try {
                // A. Obtener Perfil
                const perfil = await patientService.getMyProfile(user.user_id);
                
                if (!perfil) {
                    Swal.fire({ 
                        title: 'Perfil Incompleto', text: 'Necesitamos tus datos básicos.', icon: 'info',
                        confirmButtonText: 'Ir a mi Perfil'
                    }).then(() => navigate('/dashboard/perfil'));
                    return;
                }
                setPacienteRealId(perfil.id);

                // B. Obtener ID del Tipo de Paciente (Limpieza de datos)
                let tipoPacienteId = null;
                if (perfil.tipo_usuario) {
                    // Si viene como objeto {id: 1, nombre: 'EPS'}, tomamos id. Si viene como número, lo usamos directo.
                    tipoPacienteId = (typeof perfil.tipo_usuario === 'object') 
                        ? parseInt(perfil.tipo_usuario.id) 
                        : parseInt(perfil.tipo_usuario);
                }

                console.log("--- DEBUG FILTRO ---");
                console.log("Paciente ID Tipo:", tipoPacienteId);

                // C. Cargar Servicios y Filtrar
                const [allServicios, lugData] = await Promise.all([
                    staffService.getServicios({ activo: true }),
                    staffService.getLugares({ activo: true })
                ]);

                // --- LÓGICA DE FILTRADO CORREGIDA ---
                const serviciosFiltrados = allServicios.filter(srv => {
                    // 1. Obtener la lista de permitidos asegurando que sea un Array
                    let permitidos = srv.tipos_paciente_ids;
                    
                    // Si es null o undefined, lo volvemos array vacío
                    if (!permitidos) permitidos = [];
                    
                    // Si por error viene como string "[1, 2]", lo parseamos
                    if (typeof permitidos === 'string') {
                        try { permitidos = JSON.parse(permitidos); } catch { permitidos = []; }
                    }

                    // 2. Convertir todo a Números para asegurar comparación exacta (1 === 1)
                    const permitidosNumericos = permitidos.map(id => parseInt(id));

                    // REGLA 1: Si la lista está VACÍA, es un servicio PÚBLICO (Para todos)
                    // Si quieres que el paciente Particular NO vea servicios públicos, cambia esto.
                    // Pero lo normal es que Particular vea sus servicios + los generales.
                    if (permitidosNumericos.length === 0) {
                        return true; 
                    }

                    // REGLA 2: Si el servicio tiene restricciones (lista no vacía), 
                    // y el paciente NO tiene tipo (es nuevo), no debe verlo.
                    if (!tipoPacienteId) return false;

                    // REGLA 3: Comparación Estricta de ID vs Lista
                    const puedeVer = permitidosNumericos.includes(tipoPacienteId);
                    
                    // Debug para entender por qué sale o no sale
                    // if (!puedeVer) console.log(`Ocultando ${srv.nombre} (Requiere: ${permitidosNumericos}, Usuario tiene: ${tipoPacienteId})`);
                    
                    return puedeVer;
                });

                if (serviciosFiltrados.length === 0) {
                    Swal.fire('Sin Servicios', 'No hay servicios habilitados para tu tipo de afiliación.', 'warning');
                }

                setServicios(serviciosFiltrados);
                setLugares(lugData);

            } catch (err) { 
                console.error(err);
                Swal.fire('Error', 'Error cargando datos.', 'error');
            } finally { 
                setCheckingProfile(false); 
            }
        };
        iniciarSistema();
    }, [user.user_id, navigate]);

    // 2. Efecto Slots
    useEffect(() => {
        const fetchSlots = async () => {
            setSlots([]);
            setFormData(prev => ({ ...prev, hora_inicio: '' }));

            if (formData.profesional_id && formData.fecha && formData.servicio_id) {
                setLoadingSlots(true);
                try {
                    const disponibles = await agendaService.getSlots(
                        formData.profesional_id, formData.fecha, duracionServicio 
                    );
                    setSlots(disponibles);
                } catch (error) { console.error(error); } finally { setLoadingSlots(false); }
            }
        };
        fetchSlots();
    }, [formData.profesional_id, formData.fecha, formData.servicio_id, duracionServicio]);

    const handleServiceChange = async (e) => {
        const id = e.target.value;
        const srv = servicios.find(s => s.id === parseInt(id));
        setDuracionServicio(srv ? srv.duracion_minutos : 30);
        setFormData(prev => ({ ...prev, servicio_id: id, profesional_id: '', hora_inicio: '' }));
        
        if (id) {
            const profs = await staffService.getProfesionales({ servicios_habilitados: id, activo: true });
            setProfesionales(profs);
        } else { setProfesionales([]); }
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
                hora_fin: sumarMinutos(formData.hora_inicio, duracionServicio), 
                nota: formData.nota
            });
            await Swal.fire('¡Cita Agendada!', 'Confirmada exitosamente.', 'success');
            navigate('/dashboard/citas');
        } catch (error) { Swal.fire('Error', 'No se pudo agendar.', 'error'); } 
        finally { setLoading(false); }
    };

    const sumarMinutos = (hora, minutos) => {
        if (!hora) return '';
        const [h, m] = hora.split(':').map(Number);
        const d = new Date(); d.setHours(h, m + minutos);
        return d.toTimeString().slice(0, 5);
    };

    if (checkingProfile) return <div className="flex justify-center p-10"><FaSpinner className="animate-spin text-4xl text-blue-600"/></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-blue-900 mb-6">Agendar Nueva Cita</h1>
            <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-xl p-8 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. SERVICIOS (YA FILTRADOS) */}
                <div className="md:col-span-2">
                    <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2">
                        <FaStethoscope className="text-blue-500"/> Servicio
                    </label>
                    <select name="servicio_id" value={formData.servicio_id} onChange={handleServiceChange} required className="w-full border rounded-lg p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Selecciona --</option>
                        {servicios.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre} - ${parseFloat(s.precio_base).toLocaleString()}</option>
                        ))}
                    </select>
                    {servicios.length === 0 && <p className="text-xs text-red-500 mt-2">No hay servicios disponibles.</p>}
                </div>

                {/* 2. PROFESIONAL */}
                <div>
                    <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2"><FaUserMd className="text-blue-500"/> Especialista</label>
                    <select name="profesional_id" value={formData.profesional_id} onChange={handleChange} required disabled={!formData.servicio_id} className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                        <option value="">{formData.servicio_id ? 'Selecciona médico...' : 'Elige servicio primero'}</option>
                        {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                </div>

                {/* 3. SEDE */}
                <div>
                    <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2"><FaHospital className="text-blue-500"/> Sede</label>
                    <select name="lugar_id" value={formData.lugar_id} onChange={handleChange} required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Selecciona sede...</option>
                        {lugares.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                    </select>
                </div>

                {/* 4. FECHA */}
                <div>
                    <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2"><FaCalendarCheck className="text-blue-500"/> Fecha</label>
                    <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} min={new Date().toISOString().split('T')[0]} required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>

                {/* 5. SLOTS */}
                <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex justify-between mb-2">
                        <label className="text-blue-900 font-bold flex items-center gap-2"><FaClock/> Horarios</label>
                        {loadingSlots && <FaSpinner className="animate-spin text-blue-600"/>}
                    </div>
                    {slots.length > 0 ? (
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 max-h-40 overflow-y-auto">
                            {slots.map(h => (
                                <button key={h} type="button" onClick={() => setFormData({...formData, hora_inicio: h})} 
                                    className={`py-1 px-2 rounded text-sm font-bold ${formData.hora_inicio === h ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:border-blue-400'}`}>
                                    {h}
                                </button>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-500 italic text-center">Selecciona médico y fecha para ver disponibilidad.</p>}
                    <input type="text" value={formData.hora_inicio} required className="opacity-0 h-0 w-0 absolute" />
                </div>

                {/* 6. NOTA */}
                <div className="md:col-span-2">
                    <label className="block text-gray-700 font-bold mb-2">Notas</label>
                    <textarea name="nota" value={formData.nota} onChange={handleChange} rows="2" className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Motivo..."></textarea>
                </div>

                <div className="md:col-span-2 flex justify-end pt-4 border-t">
                    <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-10 rounded-lg shadow flex items-center gap-2 disabled:opacity-50">
                        {loading ? 'Procesando...' : <><FaSave /> Confirmar</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NuevaCita;