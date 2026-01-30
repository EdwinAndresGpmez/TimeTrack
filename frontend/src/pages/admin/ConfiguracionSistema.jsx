import React, { useEffect, useState } from 'react';
import { configService } from '../../services/configService';
import Swal from 'sweetalert2';
import { 
    FaCogs, FaSave, FaClock, FaExclamationTriangle, 
    FaCalendarCheck, FaToggleOn, FaUserEdit, FaUserSlash 
} from 'react-icons/fa';

const ConfiguracionSistema = () => {
    // Estado inicial con todos los campos
    const [config, setConfig] = useState({
        horas_antelacion_cancelar: 24,
        mensaje_notificacion_cancelacion: '',
        max_citas_dia_paciente: 1,
        permitir_mismo_servicio_dia: false,
        dias_para_actualizar_datos: 180,
        // --- NUEVOS CAMPOS ---
        limite_inasistencias: 3, 
        mensaje_bloqueo_inasistencia: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarConfig();
    }, []);

    const cargarConfig = async () => {
        try {
            const data = await configService.getConfig();
            if (data) {
                setConfig({
                    ...data,
                    max_citas_dia_paciente: data.max_citas_dia_paciente ?? 1,
                    permitir_mismo_servicio_dia: data.permitir_mismo_servicio_dia ?? false,
                    dias_para_actualizar_datos: data.dias_para_actualizar_datos ?? 180,
                    // Defaults seguros para los nuevos campos
                    limite_inasistencias: data.limite_inasistencias ?? 3,
                    mensaje_bloqueo_inasistencia: data.mensaje_bloqueo_inasistencia || ''
                });
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar la configuración.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setConfig({ ...config, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await configService.updateConfig(config);
            Swal.fire({
                title: 'Guardado',
                text: 'Reglas de negocio actualizadas correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500 font-medium">Cargando parámetros...</span>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
                    <FaCogs size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Parámetros del Sistema</h1>
                    <p className="text-gray-500 text-sm">Define las reglas de negocio globales para la gestión de citas.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                
                {/* 1. LÍMITES DE AGENDAMIENTO */}
                <div className="mb-8 pb-8 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                        <FaCalendarCheck /> Límites de Agendamiento
                    </h3>
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <label className="block font-bold text-gray-800 mb-1 text-sm">Máximo de Citas por Día</label>
                            <div className="flex items-center gap-3 mt-2">
                                <input type="number" name="max_citas_dia_paciente" value={config.max_citas_dia_paciente} onChange={handleChange} min="1" className="w-24 border border-gray-300 rounded-lg p-2 text-center font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none text-green-800" />
                                <span className="text-sm font-bold text-gray-400">citas / día</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex items-start gap-4">
                            <div className="mt-1 text-green-600"><FaToggleOn size={24}/></div>
                            <div className="flex-1">
                                <label className="block font-bold text-gray-800 mb-1 text-sm">Permitir repetir servicio</label>
                                <p className="text-xs text-gray-500 mb-3 leading-tight">Si se activa, el paciente podrá tener 2 citas del mismo servicio el mismo día.</p>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <div className="relative">
                                        <input type="checkbox" name="permitir_mismo_servicio_dia" checked={config.permitir_mismo_servicio_dia} onChange={handleChange} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </div>
                                    <span className={`text-sm font-bold ${config.permitir_mismo_servicio_dia ? 'text-green-700' : 'text-gray-500'}`}>{config.permitir_mismo_servicio_dia ? 'Habilitado' : 'Bloqueado'}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CALIDAD DE DATOS */}
                <div className="mb-8 pb-8 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-teal-700 mb-4 flex items-center gap-2">
                        <FaUserEdit /> Calidad de Datos del Paciente
                    </h3>
                    <div className="bg-teal-50/50 p-6 rounded-xl border border-teal-100 flex items-center justify-between gap-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm">Frecuencia de Actualización</label>
                            <p className="text-xs text-gray-500">Días para obligar al paciente a confirmar datos (0 desactiva).</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="number" name="dias_para_actualizar_datos" value={config.dias_para_actualizar_datos} onChange={handleChange} min="0" className="w-24 border border-gray-300 rounded-lg p-2 text-center font-bold text-lg focus:ring-2 focus:ring-teal-500 outline-none text-teal-800" />
                            <span className="text-xs font-bold text-gray-400">Días</span>
                        </div>
                    </div>
                </div>

                {/* 3. NUEVO: CONTROL DE INASISTENCIAS (SANCIONES) */}
                <div className="mb-8 pb-8 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                        <FaUserSlash /> Control de Inasistencias (Sanciones)
                    </h3>
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <label className="block text-gray-800 font-bold mb-1 text-sm">Límite de Faltas</label>
                            <p className="text-xs text-gray-500 mb-2">Cantidad de "No Asistió" permitidos antes de bloquear.</p>
                            <div className="flex items-center gap-2">
                                <input type="number" name="limite_inasistencias" value={config.limite_inasistencias} onChange={handleChange} min="0" className="w-full border border-gray-300 rounded-lg p-2 text-center font-bold text-lg focus:ring-2 focus:ring-red-500 outline-none text-red-800" />
                                <span className="text-xs font-bold text-gray-400">Citas</span>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-800 font-bold mb-1 text-sm">Mensaje de Bloqueo</label>
                            <p className="text-xs text-gray-500 mb-2">Razón que verá el paciente al intentar agendar.</p>
                            <textarea name="mensaje_bloqueo_inasistencia" value={config.mensaje_bloqueo_inasistencia} onChange={handleChange} rows="2" placeholder="Ej: Su cuenta está bloqueada por inasistencias..." className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"></textarea>
                        </div>
                    </div>
                </div>

                {/* 4. POLÍTICAS DE TIEMPO Y ALERTAS */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <FaClock /> Políticas de Cancelación
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                            <label className="block text-gray-700 font-bold mb-2 text-sm">Antelación mínima (Horas)</label>
                            <div className="relative">
                                <input type="number" name="horas_antelacion_cancelar" value={config.horas_antelacion_cancelar} onChange={handleChange} min="0" className="w-full border border-gray-300 rounded-lg p-3 pl-4 focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold text-blue-800" />
                                <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">Hrs</span>
                            </div>
                        </div>
                        <div className="bg-orange-50/50 p-6 rounded-xl border border-orange-100">
                            <label className="block text-gray-700 font-bold mb-2 text-sm">Mensaje de Error al Cancelar</label>
                            <textarea name="mensaje_notificacion_cancelacion" value={config.mensaje_notificacion_cancelacion} onChange={handleChange} rows="3" className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none text-gray-700 resize-none shadow-sm text-sm"></textarea>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button type="submit" className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-8 rounded-lg shadow-md flex items-center gap-2 transition transform hover:-translate-y-0.5 active:scale-95">
                        <FaSave /> Guardar Configuración
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ConfiguracionSistema;