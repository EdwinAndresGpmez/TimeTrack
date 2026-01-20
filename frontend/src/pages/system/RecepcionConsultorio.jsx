import React, { useState, useEffect } from 'react';
import { citasService } from '../../services/citasService';
// Importamos patientService si necesitas datos extra del paciente, 
// aunque idealmente el serializador de la cita ya trae lo básico.
import Swal from 'sweetalert2';
import { FaUserCheck, FaNotesMedical, FaHistory, FaClock, FaSave, FaTimes, FaStethoscope, FaUserInjured } from 'react-icons/fa';

const RecepcionConsultorio = () => {
    // --- ESTADOS ---
    const [citasHoy, setCitasHoy] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Estado del Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [citaSeleccionada, setCitaSeleccionada] = useState(null);
    const [historialPaciente, setHistorialPaciente] = useState([]);
    const [notaRecepcion, setNotaRecepcion] = useState("");
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    // --- CARGA INICIAL (Citas de Hoy) ---
    useEffect(() => {
        cargarCitasHoy();
    }, []);

    const cargarCitasHoy = async () => {
        setLoading(true);
        try {
            const hoy = new Date().toISOString().split('T')[0];
            
            // Traemos citas de HOY que estén ACEPTADAS o PENDIENTES
            // (Opcional: Puedes querer ver también las que ya están EN_SALA para referencia)
            const data = await citasService.getAll({ 
                fecha: hoy, 
                // Si quieres filtrar por estado desde el backend:
                // estado: 'ACEPTADA' 
            });
            
            // Filtramos en cliente para asegurar que solo mostramos las gestionables
            // O mostramos todas ordenadas por hora
            const citasPendientes = data.filter(c => ['PENDIENTE', 'ACEPTADA', 'EN_SALA'].includes(c.estado));
            setCitasHoy(citasPendientes);

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar la lista de pacientes', 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- HELPER: CALCULAR EDAD ---
    // Requiere que el serializer de Cita traiga 'paciente_fecha_nacimiento'
    // Si no lo trae, habría que hacer un fetch al patientService.getById(cita.paciente_id)
    const calcularEdad = (fechaNacimiento) => {
        if (!fechaNacimiento) return "S/D";
        const hoy = new Date();
        const nacimiento = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return `${edad} años`;
    };

    // --- ABRIR MODAL DE ATENCIÓN ---
    const handleAtender = async (cita) => {
        // Si ya fue atendida, solo mostramos la info, pero advertimos
        if (cita.estado === 'EN_SALA' || cita.estado === 'REALIZADA') {
            // Opcional: Permitir editar la nota
        }

        setCitaSeleccionada(cita);
        setNotaRecepcion(cita.nota_interna || ""); // Cargar nota previa si existe
        setModalOpen(true);
        setLoadingHistorial(true);

        try {
            // 1. Obtener Historial del Paciente
            const historial = await citasService.getHistorialPaciente(cita.paciente_id);
            // Filtramos para no mostrar la cita actual duplicada en el historial
            const historialPasado = historial.filter(h => h.id !== cita.id);
            setHistorialPaciente(historialPasado);
        } catch (error) {
            console.error("Error cargando historial", error);
        } finally {
            setLoadingHistorial(false);
        }
    };

    // --- ENVIAR A CONSULTORIO (Guardar) ---
    const confirmarIngreso = async () => {
        if (!citaSeleccionada) return;

        try {
            await citasService.update(citaSeleccionada.id, {
                estado: 'EN_SALA', // Cambiamos el estado para que el médico lo vea listo
                nota_interna: notaRecepcion // Guardamos signos vitales o notas admin
            });

            Swal.fire({
                icon: 'success',
                title: 'Paciente en Sala',
                text: 'La información ha sido enviada al consultorio.',
                timer: 2000,
                showConfirmButton: false
            });

            setModalOpen(false);
            cargarCitasHoy(); // Recargar lista para ver el cambio de estado
        } catch (error) {
            Swal.fire('Error', 'No se pudo procesar el ingreso', 'error');
        }
    };

    // Helper para colores de estado
    const getEstadoBadge = (estado) => {
        switch(estado) {
            case 'EN_SALA': return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-bold animate-pulse">En Sala</span>;
            case 'REALIZADA': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Atendido</span>;
            case 'CANCELADA': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">Cancelada</span>;
            default: return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">Pendiente</span>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            
            {/* HEADER */}
            <div className="bg-white p-6 border-b shadow-sm flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaUserInjured className="text-blue-600"/> Recepción de Pacientes
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Citas programadas para hoy: <span className="font-bold text-gray-700 capitalize">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </p>
                </div>
                <button 
                    onClick={cargarCitasHoy} 
                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition flex items-center gap-2"
                >
                    <FaHistory/> Actualizar
                </button>
            </div>

            {/* TABLA DE PACIENTES */}
            <div className="flex-1 p-6 overflow-hidden">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4">Hora</th>
                                    <th className="p-4">Paciente</th>
                                    <th className="p-4">Doctor / Servicio</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-10 text-center text-gray-400">Cargando agenda del día...</td></tr>
                                ) : citasHoy.length === 0 ? (
                                    <tr><td colSpan="5" className="p-10 text-center text-gray-400 italic">No hay citas programadas para hoy.</td></tr>
                                ) : (
                                    citasHoy.map(cita => (
                                        <tr key={cita.id} className="hover:bg-blue-50/50 transition group">
                                            <td className="p-4 font-mono font-bold text-gray-700 text-lg">
                                                {cita.hora_inicio?.slice(0,5)}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900 text-base">{cita.paciente_nombre}</div>
                                                <div className="text-xs text-gray-500">
                                                    CC: {cita.paciente_doc || '---'} 
                                                    {/* Si tienes la fecha de nacimiento en el serializer, úsala aquí también */}
                                                    {cita.paciente_fecha_nacimiento && ` • ${calcularEdad(cita.paciente_fecha_nacimiento)}`}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-gray-800 font-medium">{cita.profesional_nombre}</div>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                                                    {cita.servicio_nombre}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {getEstadoBadge(cita.estado)}
                                            </td>
                                            <td className="p-4 text-center">
                                                {cita.estado === 'EN_SALA' ? (
                                                    <button 
                                                        onClick={() => handleAtender(cita)}
                                                        className="text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg font-bold border border-transparent hover:border-purple-200 transition text-xs"
                                                    >
                                                        Editar Ingreso
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleAtender(cita)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-blue-200 transition flex items-center gap-2 mx-auto transform group-hover:scale-105"
                                                    >
                                                        <FaStethoscope /> Atender
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODAL DE INGRESO --- */}
            {modalOpen && citaSeleccionada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                        
                        {/* Header Modal */}
                        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-5 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <FaUserCheck /> Ingreso a Consultorio
                                </h2>
                                <p className="text-sm text-blue-200 opacity-90">Validación de datos y antecedentes</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition text-white">
                                <FaTimes size={20} />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                                
                                {/* COLUMNA IZQUIERDA (4/12): DATOS PACIENTE Y NOTA */}
                                <div className="lg:col-span-5 space-y-4 flex flex-col">
                                    
                                    {/* Card Paciente */}
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <FaUserInjured size={100}/>
                                        </div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Paciente</label>
                                        <div className="text-2xl font-bold text-gray-800 mt-1">{citaSeleccionada.paciente_nombre}</div>
                                        <div className="text-sm text-gray-500 mb-4">{citaSeleccionada.paciente_doc}</div>
                                        
                                        <div className="flex gap-3">
                                            <div className="bg-blue-50 px-3 py-1.5 rounded-lg text-sm text-blue-800 font-bold border border-blue-100 flex items-center gap-2">
                                                <span>🎂 Edad:</span>
                                                {/* Aquí usamos la fecha del objeto cita o calculamos */}
                                                {citaSeleccionada.paciente_fecha_nacimiento 
                                                    ? calcularEdad(citaSeleccionada.paciente_fecha_nacimiento) 
                                                    : <span className="text-xs italic text-gray-400">(Sin fecha nac.)</span>
                                                }
                                            </div>
                                            {citaSeleccionada.paciente_genero && (
                                                <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-200 font-bold">
                                                    {citaSeleccionada.paciente_genero}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Observación del Paciente (Lo que él escribió al pedir cita) */}
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                        <label className="text-xs font-bold text-orange-800 uppercase flex items-center gap-1 mb-1">
                                            <FaClock /> Motivo de Consulta (Paciente)
                                        </label>
                                        <p className="text-gray-700 text-sm italic leading-relaxed">
                                            "{citaSeleccionada.nota || 'El paciente no registró observaciones al agendar.'}"
                                        </p>
                                    </div>

                                    {/* INPUT: Nota de Recepción (Secretaria) */}
                                    <div className="bg-white p-1 rounded-xl border border-blue-200 shadow-md ring-4 ring-blue-50 flex-1 flex flex-col">
                                        <div className="bg-blue-50 p-3 rounded-t-lg border-b border-blue-100">
                                            <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                                <FaNotesMedical/> Nota de Recepción / Signos Vitales
                                            </label>
                                            <p className="text-xs text-blue-600 mt-0.5">Visible para el médico antes de iniciar.</p>
                                        </div>
                                        <textarea
                                            value={notaRecepcion}
                                            onChange={(e) => setNotaRecepcion(e.target.value)}
                                            className="w-full p-4 text-sm outline-none resize-none flex-1 text-gray-700 placeholder-gray-400 bg-transparent"
                                            placeholder="Ej: Tensión: 120/80. Paciente reporta fiebre desde ayer. Copago cancelado."
                                            autoFocus
                                        ></textarea>
                                    </div>
                                </div>

                                {/* COLUMNA DERECHA (8/12): HISTORIAL */}
                                <div className="lg:col-span-7 flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                                            <FaHistory /> Historial Clínico Reciente
                                        </h3>
                                        <span className="text-xs bg-white border px-2 py-1 rounded text-gray-500">
                                            Últimos registros
                                        </span>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
                                        {loadingHistorial ? (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <p className="text-xs">Consultando historial...</p>
                                            </div>
                                        ) : historialPaciente.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center opacity-60">
                                                <FaHistory size={40} className="mb-2"/>
                                                <p>No se encontraron citas anteriores para este paciente.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {historialPaciente.map(hist => (
                                                    <div key={hist.id} className="p-4 hover:bg-blue-50/30 transition group">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-gray-700 text-sm bg-gray-100 px-2 py-0.5 rounded">
                                                                    {hist.fecha}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {hist.hora_inicio?.slice(0,5)}
                                                                </span>
                                                            </div>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                                hist.estado === 'REALIZADA' ? 'bg-green-100 text-green-700' : 
                                                                hist.estado === 'CANCELADA' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                {hist.estado}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-sm font-bold text-blue-800">{hist.profesional_nombre}</span>
                                                            <span className="text-gray-300">•</span>
                                                            <span className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{hist.servicio_nombre}</span>
                                                        </div>

                                                        {/* Notas Médicas Previas (Si el backend las entrega en el historial) */}
                                                        <div className="text-xs text-gray-600 bg-yellow-50/50 p-2 rounded border border-yellow-100/50 italic">
                                                            {hist.nota_medica ? (
                                                                <>
                                                                    <span className="font-bold not-italic text-yellow-700">Diagnóstico/Nota: </span>
                                                                    {hist.nota_medica}
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-400">Sin notas registradas.</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 bg-gray-50 border-t flex justify-between items-center shrink-0">
                            <span className="text-xs text-gray-400 hidden sm:block">
                                * Al confirmar, el paciente aparecerá como "En Sala" para el médico.
                            </span>
                            <div className="flex gap-3 ml-auto">
                                <button 
                                    onClick={() => setModalOpen(false)}
                                    className="px-5 py-2.5 rounded-lg text-gray-600 font-bold hover:bg-gray-200 transition text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmarIngreso}
                                    className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 flex items-center gap-2 transform active:scale-95 transition text-sm"
                                >
                                    <FaSave /> Confirmar Ingreso
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecepcionConsultorio;