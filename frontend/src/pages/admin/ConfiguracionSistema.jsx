import React, { useEffect, useState } from 'react';
import { configService } from '../../services/configService';
import Swal from 'sweetalert2';
import { FaCogs, FaSave, FaClock, FaExclamationTriangle, FaCalendarCheck, FaToggleOn } from 'react-icons/fa';

const ConfiguracionSistema = () => {
    // Estado inicial con todos los campos (viejos y nuevos)
    const [config, setConfig] = useState({
        horas_antelacion_cancelar: 24,
        mensaje_notificacion_cancelacion: '',
        max_citas_dia_paciente: 1,          // Nuevo
        permitir_mismo_servicio_dia: false  // Nuevo
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarConfig();
    }, []);

    const cargarConfig = async () => {
        try {
            const data = await configService.getConfig();
            if (data) {
                // Aseguramos que los campos nuevos tengan valor si vienen null
                setConfig({
                    ...data,
                    max_citas_dia_paciente: data.max_citas_dia_paciente ?? 1,
                    permitir_mismo_servicio_dia: data.permitir_mismo_servicio_dia ?? false
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
                
                {/* 1. LÍMITES DE AGENDAMIENTO (NUEVO) */}
                <div className="mb-8 pb-8 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                        <FaCalendarCheck /> Límites de Agendamiento
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 bg-green-50 p-3 rounded-lg border border-green-100">
                        Estas reglas controlan cuántas citas puede tomar un paciente para evitar acaparamiento de la agenda.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Regla: Máximo Diario */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <label className="block font-bold text-gray-800 mb-1 text-sm">Máximo de Citas por Día</label>
                            <p className="text-xs text-gray-500 mb-3">
                                Cantidad total de citas activas permitidas para un paciente en una misma fecha.
                            </p>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number" 
                                    name="max_citas_dia_paciente" 
                                    value={config.max_citas_dia_paciente} 
                                    onChange={handleChange} 
                                    min="1" 
                                    className="w-24 border border-gray-300 rounded-lg p-2 text-center font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none text-green-800"
                                />
                                <span className="text-sm font-bold text-gray-400">citas / día</span>
                            </div>
                        </div>

                        {/* Regla: Repetir Servicio */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex items-start gap-4">
                            <div className="mt-1 text-green-600"><FaToggleOn size={24}/></div>
                            <div className="flex-1">
                                <label className="block font-bold text-gray-800 mb-1 text-sm">Permitir repetir servicio</label>
                                <p className="text-xs text-gray-500 mb-3 leading-tight">
                                    Si se activa, el paciente podrá tener 2 citas del mismo servicio (ej: Cardiología) el mismo día.
                                </p>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            name="permitir_mismo_servicio_dia" 
                                            checked={config.permitir_mismo_servicio_dia} 
                                            onChange={handleChange} 
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </div>
                                    <span className={`text-sm font-bold ${config.permitir_mismo_servicio_dia ? 'text-green-700' : 'text-gray-500'}`}>
                                        {config.permitir_mismo_servicio_dia ? 'Habilitado' : 'Bloqueado'}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. POLÍTICAS DE TIEMPO (Existente) */}
                <div className="mb-8 pb-8 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <FaClock /> Políticas de Cancelación
                    </h3>
                    
                    <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                        <label className="block text-gray-700 font-bold mb-2 text-sm">
                            Antelación mínima (Horas)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                            Horas antes de la cita requeridas para permitir la cancelación por parte del paciente.
                        </p>
                        <div className="relative max-w-xs">
                            <input
                                type="number"
                                name="horas_antelacion_cancelar"
                                value={config.horas_antelacion_cancelar}
                                onChange={handleChange}
                                min="0"
                                className="w-full border border-gray-300 rounded-lg p-3 pl-4 focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold text-blue-800"
                            />
                            <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">Hrs</span>
                        </div>
                    </div>
                </div>

                {/* 3. MENSAJES DE ALERTA (Existente) */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <FaExclamationTriangle className="text-orange-500"/> Mensajes al Usuario
                    </h3>
                    <div className="bg-orange-50/50 p-6 rounded-xl border border-orange-100">
                        <label className="block text-gray-700 font-bold mb-2 text-sm">
                            Mensaje de Rechazo (Error al Cancelar)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                            Texto que verá el paciente si intenta cancelar incumpliendo la regla de horas.
                        </p>
                        <textarea
                            name="mensaje_notificacion_cancelacion"
                            value={config.mensaje_notificacion_cancelacion}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Ej: Lo sentimos, no es posible cancelar su cita porque faltan menos de 24 horas..."
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none text-gray-700 resize-none shadow-sm"
                        ></textarea>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        type="submit"
                        className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-8 rounded-lg shadow-md flex items-center gap-2 transition transform hover:-translate-y-0.5 active:scale-95"
                    >
                        <FaSave /> Guardar Configuración
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ConfiguracionSistema;