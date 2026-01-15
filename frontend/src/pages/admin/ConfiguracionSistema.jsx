import React, { useEffect, useState } from 'react';
import { configService } from '../../services/configService';
import Swal from 'sweetalert2';
import { FaCogs, FaSave, FaClock } from 'react-icons/fa';

const ConfiguracionSistema = () => {
    const [config, setConfig] = useState({
        horas_antelacion_cancelar: 24,
        mensaje_notificacion_cancelacion: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarConfig();
    }, []);

    const cargarConfig = async () => {
        try {
            const data = await configService.getConfig();
            setConfig(data);
        } catch (error) {
            // Si falla porque no existe (raro con nuestro hack), intentamos cargar la lista que lo crea
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await configService.updateConfig(config);
            Swal.fire('Guardado', 'Las reglas del sistema han sido actualizadas.', 'success');
        } catch (error) {
            Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error');
        }
    };

    if (loading) return <div>Cargando configuración...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                    <FaCogs size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Parámetros del Sistema</h1>
                    <p className="text-gray-500">Define las reglas de negocio globales para las citas.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                
                {/* Regla: Cancelación */}
                <div className="mb-8 pb-8 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <FaClock /> Políticas de Tiempo
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">
                                Antelación mínima para cancelar (Horas)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Si el usuario intenta cancelar faltando menos de este tiempo, el sistema lo bloqueará.
                            </p>
                            <input
                                type="number"
                                name="horas_antelacion_cancelar"
                                value={config.horas_antelacion_cancelar}
                                onChange={handleChange}
                                min="0"
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold text-center text-blue-800"
                            />
                        </div>
                    </div>
                </div>

                {/* Regla: Mensajes (Ejemplo de extensibilidad) */}
                <div className="mb-6">
                    <label className="block text-gray-700 font-bold mb-2">
                        Mensaje automático al cancelar
                    </label>
                    <textarea
                        name="mensaje_notificacion_cancelacion"
                        value={config.mensaje_notificacion_cancelacion}
                        onChange={handleChange}
                        rows="2"
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    ></textarea>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-8 rounded-lg shadow-md flex items-center gap-2 transition"
                    >
                        <FaSave /> Guardar Configuración
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ConfiguracionSistema;