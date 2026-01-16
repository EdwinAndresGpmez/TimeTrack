import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffService } from '../../services/staffService';
import { citasService } from '../../services/citasService';
import { patientService } from '../../services/patientService';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { FaCalendarCheck, FaUserMd, FaHospital, FaStethoscope, FaSave } from 'react-icons/fa';

const NuevaCita = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [servicios, setServicios] = useState([]);
    const [lugares, setLugares] = useState([]);
    const [profesionales, setProfesionales] = useState([]);
    const [pacienteRealId, setPacienteRealId] = useState(null);

    const [formData, setFormData] = useState({
        servicio_id: '', profesional_id: '', lugar_id: '', fecha: '', hora_inicio: '', nota: ''
    });

    const [loading, setLoading] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(true);

    useEffect(() => {
        const iniciarSistema = async () => {
            try {
                // A. VERIFICAR PERFIL
                const perfil = await patientService.getMyProfile(user.user_id);
                
                if (!perfil) {
                    // Si llega aquí sin perfil, lo mandamos al dashboard para que el Onboarding lo capture
                    // o le mostramos alerta simple.
                    Swal.fire({
                        title: 'Perfil no encontrado',
                        text: 'No tienes una historia clínica activa para agendar.',
                        icon: 'warning',
                        confirmButtonText: 'Volver al Inicio'
                    }).then(() => navigate('/dashboard'));
                    return;
                }

                setPacienteRealId(perfil.id);

                // B. Cargar Catálogos
                const [serviciosData, lugaresData] = await Promise.all([
                    staffService.getServicios(),
                    staffService.getLugares()
                ]);
                setServicios(serviciosData);
                setLugares(lugaresData);
                
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Error al cargar datos del sistema.', 'error');
            } finally {
                setCheckingProfile(false);
            }
        };

        iniciarSistema();
        // eslint-disable-next-line
    }, []);

    // ... (El resto de funciones handleServiceChange, handleSubmit, etc. es IGUAL a lo que ya tenías) ...
    // ... Copia las funciones handleChange, handleSubmit y sumarMinutos de tu versión anterior ...

    const handleServiceChange = async (e) => {
        const servicioId = e.target.value;
        setFormData({ ...formData, servicio_id: servicioId, profesional_id: '' });
        if (servicioId) {
            try {
                const medicos = await staffService.getProfesionales(servicioId);
                setProfesionales(medicos);
            } catch (error) { console.error(error); }
        } else {
            setProfesionales([]);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!pacienteRealId) return;
        setLoading(true);
        try {
            const citaPayload = {
                usuario_id: user.user_id,
                paciente_id: pacienteRealId,
                servicio_id: formData.servicio_id,
                profesional_id: formData.profesional_id,
                lugar_id: formData.lugar_id,
                fecha: formData.fecha,
                hora_inicio: formData.hora_inicio,
                hora_fin: sumarMinutos(formData.hora_inicio, 30),
                nota: formData.nota
            };
            await citasService.create(citaPayload);
            await Swal.fire('¡Agendada!', 'Tu cita ha sido creada exitosamente.', 'success');
            navigate('/dashboard/citas');
        } catch (error) {
            Swal.fire('Error', 'No se pudo agendar la cita.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const sumarMinutos = (hora, minutos) => {
        if (!hora) return '';
        const [h, m] = hora.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m + minutos);
        return date.toTimeString().slice(0, 5);
    };

    if (checkingProfile) return <div className="p-10 text-center">Cargando...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">Agendar Nueva Cita</h1>
            <p className="text-gray-500 mb-8">Completa los datos para programar tu atención.</p>

            <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
                {/* ... (Tu JSX del formulario es IGUAL, cópialo de la versión anterior) ... */}
                {/* ... Solo asegúrate de copiar todos los inputs y selects ... */}
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2">
                            <FaStethoscope className="text-blue-500"/> Servicio Médico
                        </label>
                        <select name="servicio_id" value={formData.servicio_id} onChange={handleServiceChange} required className="w-full border border-gray-300 rounded-lg p-3 outline-none">
                            <option value="">-- Selecciona --</option>
                            {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio_base}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2"><FaUserMd className="text-blue-500"/> Profesional</label>
                        <select name="profesional_id" value={formData.profesional_id} onChange={handleChange} required disabled={!formData.servicio_id} className="w-full border border-gray-300 rounded-lg p-3 outline-none disabled:bg-gray-100">
                            <option value="">-- Selecciona --</option>
                            {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>

                    <div>
                         <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2"><FaHospital className="text-blue-500"/> Sede</label>
                         <select name="lugar_id" value={formData.lugar_id} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg p-3 outline-none">
                            <option value="">-- Selecciona --</option>
                            {lugares.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2"><FaCalendarCheck className="text-blue-500"/> Fecha</label>
                        <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} required min={new Date().toISOString().split('T')[0]} className="w-full border border-gray-300 rounded-lg p-3 outline-none"/>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2 flex items-center gap-2"><FaCalendarCheck className="text-blue-500"/> Hora</label>
                        <input type="time" name="hora_inicio" value={formData.hora_inicio} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg p-3 outline-none"/>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-gray-700 font-bold mb-2">Nota</label>
                        <textarea name="nota" value={formData.nota} onChange={handleChange} rows="3" className="w-full border border-gray-300 rounded-lg p-3 outline-none"></textarea>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105 disabled:opacity-50">
                        {loading ? 'Agendando...' : <><FaSave /> Confirmar Cita</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NuevaCita;