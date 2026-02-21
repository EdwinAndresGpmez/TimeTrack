import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffService } from '../../services/staffService';
import { citasService } from '../../services/citasService';
import { patientService } from '../../services/patientService';
import { agendaService } from '../../services/agendaService';
import { authService } from '../../services/authService'; // IMPORTANTE
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { 
    FaStethoscope, FaUserMd, FaHospital, FaCalendarAlt, FaClock, 
    FaCheckCircle, FaMagic, FaArrowRight, FaArrowLeft, FaChevronRight, 
    FaChevronLeft, FaTimes, FaUsers, FaUserCircle 
} from 'react-icons/fa';

const NuevaCita = ({ adminSelectedPatientId = null, isAdminMode = false, preselectedSlot = null }) => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    // --- ESTADOS DE DATOS ---
    const [servicios, setServicios] = useState([]);
    const [profesionales, setProfesionales] = useState([]); 
    const [sedes, setSedes] = useState([]); 
    
    // --- ESTADOS WIZARD ---
    const [step, setStep] = useState(0); 
    const [selection, setSelection] = useState({ servicio: null, profesional: null, sede: null, fecha: '', hora: '' });
    
    // --- ESTADOS AUXILIARES ---
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    
    const [pacienteId, setPacienteId] = useState(null);
    const [perfilPaciente, setPerfilPaciente] = useState(null); 
    
    // Datos de la red familiar
    const [dependientes, setDependientes] = useState([]);
    const [titularPerfil, setTitularPerfil] = useState(null);
    
    const [fechaInicioCarrusel, setFechaInicioCarrusel] = useState(() => {
        const d = new Date();
        d.setHours(0,0,0,0);
        return d;
    });

    const [showAssistant, setShowAssistant] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [assistantLoading, setAssistantLoading] = useState(false);
    const [searchDateStart, setSearchDateStart] = useState(new Date());

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const idActual = user.user_id || user.id;
                let perfilPrincipal;

                // 1. Obtener datos del paciente titular
                if (adminSelectedPatientId) {
                    perfilPrincipal = await patientService.getPatientById(adminSelectedPatientId);
                } else {
                    perfilPrincipal = await patientService.getMyProfile(idActual);
                }
                setTitularPerfil(perfilPrincipal);

                // 2. CORRECCIÓN: Consultar Red Familiar en tiempo real para el paso 0
                let dependientesLocales = [];
                if (!isAdminMode && !adminSelectedPatientId) {
                    try {
                        // CAMBIO AQUÍ: Usamos la ruta "pública" /me/red/
                        const dataRed = await authService.getMiRedFamiliar(); 
                        dependientesLocales = dataRed || [];
                        setDependientes(dependientesLocales);
                    } catch (errRed) {
                        console.error("Error consultando red familiar:", errRed);
                    }
                }
                // 3. Decidir en qué paso iniciar
                if (preselectedSlot) {
                    // Si viene de la agenda, saltamos directo al final
                    setPacienteId(perfilPrincipal.id);
                    setPerfilPaciente(perfilPrincipal);
                    setStep(preselectedSlot.servicioId ? 5 : 1);
                } else if (dependientesLocales.length > 0 && !adminSelectedPatientId) {
                    // SI TIENE FAMILIARES -> PASO 0
                    setStep(0);
                } else {
                    // CASO NORMAL -> PASO 1
                    setPacienteId(perfilPrincipal.id);
                    setPerfilPaciente(perfilPrincipal);
                    setStep(1);
                }

                // 4. Cargar catálogos iniciales
                const [allServicios, allSedes, allProfesionales] = await Promise.all([
                    staffService.getServicios({ activo: true }),
                    staffService.getLugares({ activo: true }),
                    staffService.getProfesionales({ activo: true })
                ]);
                
                setServicios(allServicios);
                setSedes(allSedes); 
                setProfesionales(allProfesionales);

                if (preselectedSlot) {
                    const servicioMatch = preselectedSlot.servicioId ? allServicios.find(s => parseInt(s.id) === parseInt(preselectedSlot.servicioId)) : null;
                    const profMatch = allProfesionales.find(p => parseInt(p.id) === parseInt(preselectedSlot.profId));
                    const sedeMatch = allSedes.find(s => parseInt(s.id) === parseInt(preselectedSlot.lugarId));

                    setSelection({
                        servicio: servicioMatch, 
                        profesional: profMatch || { id: preselectedSlot.profId, nombre: preselectedSlot.profNombre },
                        sede: sedeMatch || { id: preselectedSlot.lugarId, nombre: 'Sede no encontrada' },
                        fecha: preselectedSlot.fecha,
                        hora: preselectedSlot.inicio
                    });
                }

            } catch (e) { 
                console.error("Error inicializando NuevaCita:", e);
                Swal.fire('Error', 'No se pudo cargar la información para agendar.', 'error');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [adminSelectedPatientId, user, preselectedSlot, isAdminMode]);

    const seleccionarPaciente = async (esTitular, depData = null) => {
        setLoading(true);
        try {
            let perfilSeleccionado;
            if (esTitular) {
                perfilSeleccionado = titularPerfil;
            } else {
                // Buscamos la ficha médica (Paciente) del dependiente usando su user_id
                perfilSeleccionado = await patientService.getProfileByUserId(depData.id);
            }

            setPacienteId(perfilSeleccionado.id);
            setPerfilPaciente(perfilSeleccionado);
            
            // Filtro de servicios por tipo de paciente
            const tipoId = perfilSeleccionado.tipo_usuario?.id || perfilSeleccionado.tipo_usuario;
            const allServicios = await staffService.getServicios({ activo: true });
            let serviciosFiltrados = allServicios.filter(s => {
                const permitidos = s.tipos_paciente_ids?.map(Number) || [];
                return permitidos.length === 0 || (tipoId && permitidos.includes(Number(tipoId)));
            });
            setServicios(serviciosFiltrados);
            
            setStep(1); 
        } catch (error) {
            Swal.fire('Atención', 'El familiar seleccionado aún no tiene una ficha médica creada.', 'warning');
        } finally {
            setLoading(false);
        }
    };

    const fetchSlots = useCallback(async () => {
        if (preselectedSlot) return; 

        setLoadingSlots(true);
        setSlots([]);
        try {
            const slotsBase = await agendaService.getSlots(
                selection.profesional.id, 
                selection.fecha, 
                selection.servicio.duracion_minutos
            );

            const [bloqueosData, rawCitas] = await Promise.all([
                agendaService.getBloqueos({ profesional_id: selection.profesional.id }),
                citasService.getAll({ profesional_id: selection.profesional.id, fecha: selection.fecha })
            ]);

            const citasDia = Array.isArray(rawCitas) ? rawCitas : (rawCitas?.results || []);
            const ahoraMismo = new Date();

            const slotsLimpios = slotsBase
                .filter(slot => {
                    const h = typeof slot === 'object' ? slot.hora : slot;
                    if (typeof slot === 'object' && slot.disponible === false) return false; 

                    const slotStart = new Date(`${selection.fecha}T${h}`);
                    if (!isAdminMode && slotStart < ahoraMismo) return false;

                    const isBloqueado = bloqueosData.some(b => {
                        const bStart = new Date(b.fecha_inicio);
                        const bEnd = new Date(b.fecha_fin);
                        return slotStart >= bStart && slotStart < bEnd;
                    });
                    
                    const isOcupado = citasDia.some(cita => {
                        if (cita.estado === 'CANCELADA' || cita.estado === 'RECHAZADA') return false;
                        return cita.hora_inicio.startsWith(h);
                    });

                    return !isBloqueado && !isOcupado;
                })
                .map(slot => typeof slot === 'object' ? slot.hora : slot); 

            setSlots(slotsLimpios);
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoadingSlots(false); 
        }
    }, [selection.profesional, selection.fecha, selection.servicio, isAdminMode, preselectedSlot]);

    useEffect(() => {
        if (selection.profesional && selection.sede && selection.fecha && step === 4) {
            fetchSlots();
        }
    }, [selection.fecha, selection.profesional, selection.sede, step, fetchSlots]);

    const abrirAsistente = () => {
        if (!selection.servicio) return Swal.fire('Paso 1', 'Elige un servicio primero.', 'info');
        setShowAssistant(true);
        setSuggestions([]);
        setSearchDateStart(new Date()); 
        buscarSugerencias(new Date(), true);
    };

    const buscarSugerencias = async (fechaInicio, reset = false) => {
        setAssistantLoading(true);
        try {
            let profsDelServicio = profesionales;
            if (profsDelServicio.length === 0) {
                profsDelServicio = await staffService.getProfesionales({ servicios_habilitados: selection.servicio.id, activo: true });
                setProfesionales(profsDelServicio);
            }

            if (profsDelServicio.length === 0) throw new Error("No hay médicos disponibles.");

            const nuevosResultados = [];
            let diaActual = new Date(fechaInicio);
            let diasBuscados = 0;
            const ahoraMismo = new Date();
            
            while (nuevosResultados.length < 3 && diasBuscados < 14) {
                const fechaStr = diaActual.toISOString().split('T')[0];
                
                for (const prof of profsDelServicio) {
                    if (!prof.lugares_atencion || prof.lugares_atencion.length === 0) continue;
                    
                    const slotsBase = await agendaService.getSlots(prof.id, fechaStr, selection.servicio.duracion_minutos);
                    
                    if (slotsBase.length > 0) {
                        const [bloqueosData, rawCitas] = await Promise.all([
                            agendaService.getBloqueos({ profesional_id: prof.id }),
                            citasService.getAll({ profesional_id: prof.id, fecha: fechaStr })
                        ]);

                        const citasDia = Array.isArray(rawCitas) ? rawCitas : (rawCitas?.results || []);

                        const slotLibre = slotsBase.find(slot => {
                            const h = typeof slot === 'object' ? slot.hora : slot;
                            if (typeof slot === 'object' && slot.disponible === false) return false;

                            const slotStart = new Date(`${fechaStr}T${h}`);
                            if (!isAdminMode && slotStart < ahoraMismo) return false;
                            
                            const isBloqueado = bloqueosData.some(b => new Date(b.fecha_inicio) <= slotStart && new Date(b.fecha_fin) > slotStart);
                            
                            const isOcupado = citasDia.some(c => {
                                if (c.estado === 'CANCELADA' || c.estado === 'RECHAZADA') return false;
                                return c.hora_inicio.startsWith(h);
                            });

                            return !isBloqueado && !isOcupado;
                        });

                        if (slotLibre) {
                            nuevosResultados.push({
                                profesional: prof,
                                sede: sedes.find(s => s.id === prof.lugares_atencion[0]),
                                fecha: fechaStr,
                                hora: typeof slotLibre === 'object' ? slotLibre.hora : slotLibre
                            });
                        }
                    }
                    if (nuevosResultados.length >= 3) break;
                }
                diaActual.setDate(diaActual.getDate() + 1);
                diasBuscados++;
            }

            setSearchDateStart(diaActual); 
            if (reset) setSuggestions(nuevosResultados);
            else setSuggestions(prev => [...prev, ...nuevosResultados]);

        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No pudimos cargar sugerencias.', 'error');
        } finally {
            setAssistantLoading(false);
        }
    };

    const seleccionarSugerencia = (sug) => {
        setSelection(prev => ({ ...prev, profesional: sug.profesional, sede: sug.sede, fecha: sug.fecha, hora: sug.hora }));
        setShowAssistant(false);
        setStep(5);
    };

    const nextStep = () => setStep(s => s + 1);

    const prevStep = () => {
        if (preselectedSlot) {
            if (step === 5 && !preselectedSlot.servicioId) {
                setSelection({ ...selection, servicio: null });
                setStep(1);
            } else {
                Swal.fire({
                    title: '¿Cancelar modo Express?', text: "Volverás a la agenda.", icon: 'warning',
                    showCancelButton: true, confirmButtonText: 'Sí, volver', cancelButtonText: 'No'
                }).then((result) => {
                    if (result.isConfirmed) navigate('/dashboard/admin/agenda');
                });
            }
        } else {
            if (step === 1 && dependientes.length > 0 && !isAdminMode) {
                setStep(0);
                setPacienteId(null);
                setPerfilPaciente(null);
            } else {
                setStep(s => s - 1);
            }
        }
    };

    const selectServicio = async (srv) => {
        if (preselectedSlot) {
            setSelection({ ...selection, servicio: srv });
            setStep(5);
        } else {
            setSelection({ ...selection, servicio: srv, profesional: null, sede: null });
            const profs = await staffService.getProfesionales({ servicios_habilitados: srv.id, activo: true });
            setProfesionales(profs);
            nextStep();
        }
    };

    const selectProfesional = (prof) => {
        setSelection({ ...selection, profesional: prof, sede: null });
        nextStep();
    };

    const selectSede = (sede) => {
        setSelection({ ...selection, sede: sede });
        nextStep();
    };

    const confirmCita = async () => {
        setLoading(true);
        try {
            const duracion = selection.servicio?.duracion_minutos || 30;
            const [horas, minutos] = selection.hora.split(':').map(Number);
            const fechaTemp = new Date();
            fechaTemp.setHours(horas, minutos, 0);
            fechaTemp.setMinutes(fechaTemp.getMinutes() + duracion);
            const horaFinCalc = fechaTemp.toTimeString().slice(0, 5);

            await citasService.create({
                paciente_id: pacienteId,
                servicio_id: selection.servicio.id,
                profesional_id: selection.profesional.id,
                lugar_id: selection.sede.id,
                fecha: selection.fecha,
                hora_inicio: selection.hora,
                hora_fin: horaFinCalc,
                is_admin_mode: isAdminMode, 
                nota: adminSelectedPatientId || perfilPaciente?.id !== titularPerfil?.id ? `Cita gestionada por delegado para: ${perfilPaciente?.nombre}` : 'Agendado vía Web'
            });
            await Swal.fire('¡Cita Confirmada!', 'La cita ha sido agendada con éxito.', 'success');
            navigate(adminSelectedPatientId ? '/dashboard/admin/citas' : '/dashboard/citas');
        } catch (error) {
            let mensajeError = 'No se pudo agendar la cita. Intente nuevamente.';
            if (error.response?.data) {
                const data = error.response.data;
                mensajeError = data.detalle || data.detail || (typeof data === 'object' ? Object.values(data).flat().join('. ') : mensajeError);
            }
            Swal.fire({ icon: 'error', title: 'Error', text: mensajeError });
        } finally { 
            setLoading(false); 
        }
    };

    const getDiasCarrusel = () => {
        const dias = [];
        for (let i = 0; i < 5; i++) { 
            const d = new Date(fechaInicioCarrusel);
            d.setDate(fechaInicioCarrusel.getDate() + i);
            dias.push(d);
        }
        return dias;
    };

    const moverCarrusel = (dias) => {
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        const nuevaFecha = new Date(fechaInicioCarrusel);
        nuevaFecha.setDate(nuevaFecha.getDate() + dias);
        if (nuevaFecha < hoy) setFechaInicioCarrusel(hoy);
        else setFechaInicioCarrusel(nuevaFecha);
    };

    const esElInicio = fechaInicioCarrusel.getTime() === new Date().setHours(0,0,0,0);

    const renderStep0 = () => (
        <div className="animate-fadeIn max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaUsers size={36}/>
            </div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">¿Para quién es la cita hoy?</h2>
            <p className="text-gray-500 mb-8">Selecciona el paciente para el cual deseas agendar el espacio.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={() => seleccionarPaciente(true)}
                    className="bg-white border-2 border-purple-200 hover:border-purple-500 hover:shadow-xl p-6 rounded-2xl flex items-center gap-4 transition-all group text-left"
                >
                    <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <FaUserCircle size={28}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">Para Mí</h3>
                        <p className="text-sm text-gray-500">{titularPerfil?.nombre}</p>
                    </div>
                </button>

                {dependientes.map(dep => (
                    <button 
                        key={dep.id}
                        onClick={() => seleccionarPaciente(false, dep)}
                        className="bg-white border-2 border-indigo-100 hover:border-indigo-400 hover:shadow-xl p-6 rounded-2xl flex items-center gap-4 transition-all group text-left"
                    >
                        <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors font-bold text-xl uppercase">
                            {dep.nombre.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <h3 className="font-bold text-lg text-gray-800 truncate" title={dep.nombre}>{dep.nombre}</h3>
                            <p className="text-xs text-gray-500 font-mono">Doc: {dep.documento}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep1 = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
            {servicios.length > 0 ? servicios.map(s => (
                <div key={s.id} onClick={() => selectServicio(s)} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                        <FaStethoscope size={28}/>
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-700">{s.nombre}</h3>
                </div>
            )) : <div className="col-span-3 text-center text-red-500 py-8">No hay servicios disponibles para mostrar.</div>}
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4 animate-fadeIn">
            <button onClick={abrirAsistente} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-center gap-3 hover:shadow-purple-200 hover:scale-[1.01] transition duration-300 mb-8 border border-white/20">
                <div className="bg-white/20 p-2 rounded-full"><FaMagic className="text-xl animate-pulse"/></div>
                <div className="text-center md:text-left">
                    <span className="font-bold text-lg block">Usar Asistente Inteligente</span>
                    <span className="text-xs text-purple-100 font-normal">Te mostramos las opciones más cercanas automáticamente</span>
                </div>
            </button>
            <h3 className="text-gray-500 font-bold text-sm uppercase mb-4 tracking-wide border-b pb-2">O selecciona manualmente un especialista:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profesionales.map(p => (
                    <div key={p.id} onClick={() => selectProfesional(p)} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 text-lg uppercase">{p.nombre.charAt(0)}</div>
                        <div>
                            <h4 className="font-bold text-gray-800">{p.nombre}</h4>
                            <p className="text-xs text-gray-500">{p.registro_medico ? `RM: ${p.registro_medico}` : 'Profesional'}</p>
                        </div>
                        <FaArrowRight className="ml-auto text-gray-300"/>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep3 = () => {
        const sedesMedico = sedes.filter(s => selection.profesional.lugares_atencion.includes(s.id));
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                {sedesMedico.length > 0 ? sedesMedico.map(s => (
                    <div key={s.id} onClick={() => selectSede(s)} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-green-500 hover:shadow-md cursor-pointer transition flex items-center gap-4">
                        <div className="bg-green-50 p-3 rounded-lg text-green-600"><FaHospital size={24}/></div>
                        <div><h4 className="font-bold text-gray-800">{s.nombre}</h4><p className="text-sm text-gray-500">{s.direccion}</p></div>
                    </div>
                )) : <div className="col-span-2 text-center text-red-500 p-8">El médico no tiene sedes disponibles.</div>}
            </div>
        );
    };

    const renderStep4 = () => {
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fadeIn">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => moverCarrusel(-5)} disabled={esElInicio} className={`p-2 rounded-full transition ${esElInicio ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-500'}`}><FaChevronLeft/></button>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
                        {getDiasCarrusel().map((fecha, idx) => {
                            const fechaIso = fecha.toISOString().split('T')[0];
                            const isSelected = selection.fecha === fechaIso;
                            const esHoy = fechaIso === new Date().toISOString().split('T')[0];
                            return (
                                <div key={idx} onClick={() => setSelection({ ...selection, fecha: fechaIso, hora: '' })} className={`flex flex-col items-center justify-center w-16 h-20 rounded-xl cursor-pointer transition-all border-2 flex-shrink-0 ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700 transform scale-105' : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                    <span className="text-xs font-bold uppercase">{esHoy ? 'HOY' : diasSemana[fecha.getDay()]}</span>
                                    <span className="text-xl font-black">{fecha.getDate()}</span>
                                    <span className="text-[10px]">{meses[fecha.getMonth()]}</span>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={() => moverCarrusel(5)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"><FaChevronRight/></button>
                </div>
                {selection.fecha ? (
                    <div className="animate-fadeIn">
                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <FaClock className="text-blue-500"/> Horarios Disponibles
                            {loadingSlots && <span className="text-xs font-normal text-gray-400 ml-2 animate-pulse">Buscando...</span>}
                        </h4>
                        {slots.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {slots.map(h => (
                                    <button key={h} onClick={() => { setSelection({ ...selection, hora: h }); nextStep(); }} className={`py-2 px-1 rounded-lg text-sm font-bold border transition-all duration-200 ${selection.hora === h ? 'bg-blue-600 text-white shadow-lg transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600 hover:shadow-md'}`}>{h}</button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-500 font-medium">No hay horarios disponibles.</p>
                                <button onClick={() => moverCarrusel(1)} className="text-blue-600 text-sm font-bold mt-2 hover:underline">Ver día siguiente</button>
                            </div>
                        )}
                    </div>
                ) : <div className="text-center text-gray-400 py-8 border-t border-dashed border-gray-100 mt-4">Selecciona un día</div>}
            </div>
        );
    };

    const renderStep5 = () => (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-blue-50 text-center max-w-md mx-auto animate-zoomIn">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><FaCheckCircle size={40}/></div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">¡Casi listo!</h2>
            <div className="bg-gray-50 p-6 rounded-2xl mb-8 text-left space-y-4 border border-gray-100">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Paciente</span>
                    <span className="font-bold text-indigo-600 truncate max-w-[200px]" title={perfilPaciente?.nombre}>
                        {perfilPaciente?.nombre} {perfilPaciente?.apellido}
                    </span>
                </div>
                <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Servicio</span><span className="font-bold text-gray-800">{selection.servicio?.nombre || 'General'}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Profesional</span><span className="font-bold text-gray-800">{selection.profesional?.nombre}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Sede</span><span className="font-bold text-gray-800 text-xs text-right max-w-[150px] truncate" title={selection.sede?.nombre}>{selection.sede?.nombre}</span></div>
                <div className="h-px bg-gray-200 my-2"></div>
                <div className="flex justify-between items-center"><span className="text-gray-500 text-sm">Fecha y Hora</span><span className="font-bold text-blue-600 text-lg">{selection.fecha} | {selection.hora}</span></div>
            </div>
            <button onClick={confirmCita} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg transition disabled:opacity-50">{loading ? 'Confirmando...' : 'Confirmar Agendamiento'}</button>
            <button onClick={() => {
                if(preselectedSlot) navigate('/dashboard/admin/agenda');
                else { 
                    setSelection({ servicio: null, profesional: null, sede: null, fecha: '', hora: '' }); 
                    setStep(dependientes.length > 0 && !isAdminMode ? 0 : 1); 
                }
            }} className="mt-4 text-gray-400 text-sm hover:text-gray-600 underline">
                {preselectedSlot ? 'Cancelar y volver a la agenda' : 'Empezar de nuevo'}
            </button>
        </div>
    );

    if (loading && step === 0) return (
        <div className="flex flex-col items-center justify-center h-64 text-blue-600">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <span className="font-bold">Verificando red familiar...</span>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto p-4">
            {adminSelectedPatientId && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider">Modo Administrativo</p>
                        <h2 className="text-indigo-900 font-bold">Agendando para: {perfilPaciente?.nombre || "Cargando..."}</h2>
                    </div>
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold">Admin</div>
                </div>
            )}

            {step > 0 && (
                <div className="flex items-center justify-center mb-10 gap-2">
                    {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 rounded-full flex-1 transition-all duration-700 ${step >= i ? 'bg-blue-600' : 'bg-gray-200'}`}></div>)}
                </div>
            )}

            {step > 0 && step < 5 && (
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800">
                            {step === 1 && "Elige tu Servicio"} 
                            {step === 2 && "Selecciona Especialista"} 
                            {step === 3 && "Selecciona Sede"} 
                            {step === 4 && "¿Cuándo te atendemos?"}
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Paso {step} de 5</p>
                    </div>
                    <button onClick={prevStep} className="text-gray-500 hover:text-blue-600 flex items-center gap-2 text-sm font-bold bg-white px-4 py-2 rounded-lg border transition shadow-sm"><FaArrowLeft/> Atrás</button>
                </div>
            )}

            {step === 0 && renderStep0()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}

            {showAssistant && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex justify-between items-start text-white">
                            <div><h3 className="text-xl font-bold flex items-center gap-2"><FaMagic className="text-yellow-300"/> Asistente Inteligente</h3><p className="text-purple-100 text-sm mt-1">Opciones para {perfilPaciente?.nombre}</p></div>
                            <button onClick={() => setShowAssistant(false)} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition"><FaTimes size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                            {assistantLoading && suggestions.length === 0 ? <div className="text-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div></div> : suggestions.length === 0 ? <div className="text-center py-10 text-gray-500"><p>No hay opciones.</p></div> : (
                                <div className="space-y-3">
                                    {suggestions.map((sug, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
                                            <div className="text-left"><h4 className="font-bold text-gray-800">{sug.profesional.nombre}</h4><p className="text-xs text-gray-500">{sug.fecha} | {sug.hora}</p></div>
                                            <button onClick={() => seleccionarSugerencia(sug)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Seleccionar</button>
                                        </div>
                                    ))}
                                    <button onClick={() => buscarSugerencias(searchDateStart)} disabled={assistantLoading} className="w-full mt-4 py-3 text-sm text-gray-400 font-bold uppercase tracking-widest border-2 border-dashed border-gray-200 rounded-xl">Cargar más</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NuevaCita;