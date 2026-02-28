import React, { useState, useEffect, useContext, useCallback } from 'react';
import { citasService } from '../../services/citasService';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { 
    FaUserMd, FaBullhorn, FaCheckCircle, 
    FaNotesMedical, FaWalking, FaUserInjured, FaClock, FaExclamationTriangle
} from 'react-icons/fa';

const DashboardProfesional = () => {
    const { user } = useContext(AuthContext);
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);

    const cargarAgendaDia = useCallback(async () => {
        if (!user?.profesional_id) {
            console.error("❌ Error: El usuario no tiene vinculado un profesional_id en su token.");
            setLoading(false);
            return;
        }

        try {
            // CORRECCIÓN DE FECHA: Obtener YYYY-MM-DD en hora LOCAL, no UTC
            const hoyLocal = new Date();
            const offset = hoyLocal.getTimezoneOffset();
            const fechaQuery = new Date(hoyLocal.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

            console.log(`🔍 Consultando citas para Prof: ${user.profesional_id} en Fecha: ${fechaQuery}`);
            
            const data = await citasService.getAll({
                profesional_id: user.profesional_id,
                fecha: fechaQuery,
                ordering: 'hora_inicio'
            });

            const lista = Array.isArray(data) ? data : (data.results || []);
            console.log("✅ Respuesta del servidor:", lista);
            setCitas(lista);
        } catch (error) {
            console.error("❌ Error en la petición:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        cargarAgendaDia();
        const interval = setInterval(cargarAgendaDia, 30000); 
        return () => clearInterval(interval);
    }, [cargarAgendaDia]);

    const llamarPaciente = async (cita) => {
        try {
            await citasService.updateEstado(cita.id, { estado: 'LLAMADO' });
            Swal.fire({ toast: true, position: 'top-end', title: 'Llamando...', icon: 'success', showConfirmButton: false, timer: 2000 });
            cargarAgendaDia();
        } catch (error) {
            Swal.fire('Error', 'No se pudo activar el llamado', 'error');
        }
    };

    const finalizarAtencion = async (cita) => {
        const { value: nota } = await Swal.fire({
            title: 'Finalizar Consulta',
            html: `<div class="text-left text-sm text-gray-500 mb-2">Evolución para: <b>${cita.paciente_nombre}</b></div>`,
            input: 'textarea',
            inputPlaceholder: 'Notas médicas...',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#10b981',
            inputValidator: (value) => !value && 'La nota es obligatoria'
        });

        if (nota) {
            try {
                await citasService.updateEstado(cita.id, { estado: 'REALIZADA', notas_medicas: nota });
                Swal.fire({ title: 'Finalizada', icon: 'success', timer: 1500, showConfirmButton: false });
                cargarAgendaDia();
            } catch (error) {
                Swal.fire('Error', 'No se pudo cerrar', 'error');
            }
        }
    };

    // Estados que el médico puede gestionar
    const enEspera = citas.filter(c => ['EN_SALA', 'LLAMADO', 'ACEPTADA'].includes(c.estado));

    return (
        <div className="max-w-7xl mx-auto p-6 min-h-screen bg-gray-50/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-6">
                    <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl">
                        <FaUserMd size={40} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Panel de Atención</h1>
                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-1">
                            ID Médico: {user?.profesional_id || '---'}
                        </p>
                    </div>
                </div>
                <div className="mt-4 md:mt-0 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-blue-700 font-black text-2xl leading-none">{enEspera.length}</span>
                        <span className="text-blue-400 font-bold text-[10px] uppercase tracking-tighter">Pacientes hoy</span>
                    </div>
                    <FaWalking className="text-blue-300" size={24} />
                </div>
            </div>

            {/* Diagnóstico si la lista total está vacía */}
            {!loading && citas.length === 0 && (
                <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 text-orange-700 text-sm">
                    <FaExclamationTriangle />
                    <span>El servidor no encontró ninguna cita para hoy con el ID {user?.profesional_id}. Verifique en la administración que este profesional tenga citas asignadas para esta fecha.</span>
                </div>
            )}

            {/* Listado de Tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full text-center py-20 animate-pulse text-gray-400">Sincronizando...</div>
                ) : enEspera.length === 0 ? (
                    <div className="col-span-full bg-white p-20 rounded-[3rem] text-center border-4 border-dashed border-gray-100 flex flex-col items-center">
                        <FaUserInjured size={64} className="text-gray-200 mb-4" />
                        <h3 className="text-xl font-bold text-gray-400 uppercase">Sin pacientes en turno</h3>
                        {citas.length > enEspera.length && (
                            <p className="text-indigo-500 text-xs mt-2 font-bold uppercase">
                                Hay {citas.length - enEspera.length} citas en otros estados (ej: PENDIENTE) que no aparecen aquí.
                            </p>
                        )}
                    </div>
                ) : (
                    enEspera.map(cita => (
                        <div key={cita.id} className={`group relative bg-white rounded-[2.5rem] shadow-2xl border-2 transition-all duration-500 ${cita.estado === 'LLAMADO' ? 'border-yellow-400 scale-105 ring-4 ring-yellow-50' : 'border-transparent hover:border-blue-200'}`}>
                            
                            <div className="absolute -top-4 left-8 bg-gray-900 text-white px-4 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-2">
                                <FaClock size={10} className="text-blue-400" />
                                {cita.hora_inicio.slice(0,5)}
                            </div>

                            <div className="p-8 pt-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${cita.estado === 'LLAMADO' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                        <FaUserInjured size={28} />
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {cita.estado === 'LLAMADO' && <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">Llamado</span>}
                                        {cita.estado === 'EN_SALA' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">En Sala</span>}
                                        {cita.estado === 'ACEPTADA' && <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">Agendado</span>}
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-gray-800 leading-tight uppercase mb-1">{cita.paciente_nombre}</h3>
                                <p className="text-xs font-mono text-gray-400 font-bold mb-6">{cita.paciente_doc}</p>

                                <div className="bg-gray-50 p-5 rounded-3xl mb-8 border border-gray-100 min-h-[100px]">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter block mb-2 flex items-center gap-1">
                                        <FaNotesMedical className="text-blue-500"/> Notas de Ingreso
                                    </span>
                                    <p className="text-xs text-gray-600 leading-relaxed italic">
                                        {cita.nota_interna ? `"${cita.nota_interna}"` : "Sin observaciones registradas."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => llamarPaciente(cita)} className="flex flex-col items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                                        <FaBullhorn size={18} />
                                        <span className="text-[10px] uppercase">Llamar</span>
                                    </button>
                                    <button onClick={() => finalizarAtencion(cita)} className="flex flex-col items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 active:scale-95 transition-all">
                                        <FaCheckCircle size={18} />
                                        <span className="text-[10px] uppercase">Finalizar</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DashboardProfesional;