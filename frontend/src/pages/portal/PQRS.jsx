import React, { useState } from 'react';
import Navbar from '../../components/portal/Navbar';
import Footer from '../../components/portal/Footer';
import { portalService } from '../../services/portalService';

const PQRS = () => {
    const [formData, setFormData] = useState({
        tipo: 'PETICION',
        nombre_remitente: '',
        correo: '',
        telefono: '',
        asunto: '',
        mensaje: '',
        adjunto: null
    });
    const [status, setStatus] = useState(null); // 'success' | 'error' | 'loading'

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, adjunto: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        // FormData es necesario para enviar archivos
        const dataToSend = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key]) dataToSend.append(key, formData[key]);
        });

        try {
            await portalService.createPQRS(dataToSend);
            setStatus('success');
            setFormData({ tipo: 'PETICION', nombre_remitente: '', correo: '', telefono: '', asunto: '', mensaje: '', adjunto: null });
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <>
            <Navbar />
            <div className="container mx-auto px-4 py-24 md:py-32 max-w-3xl">
                <h1 className="text-3xl font-bold text-blue-900 mb-6 text-center">Radicar PQRS</h1>
                <p className="text-center text-gray-600 mb-8">
                    Tu opinión es importante. Por favor diligencia el formulario para Peticiones, Quejas, Reclamos o Sugerencias.
                </p>

                {status === 'success' && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 text-center">
                        ¡Recibido! Tu solicitud ha sido radicada correctamente.
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-center">
                        Ocurrió un error al enviar. Por favor intenta de nuevo.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-8 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Tipo de Solicitud</label>
                            <select name="tipo" value={formData.tipo} onChange={handleChange} className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="PETICION">Petición</option>
                                <option value="QUEJA">Queja</option>
                                <option value="RECLAMO">Reclamo</option>
                                <option value="SUGERENCIA">Sugerencia</option>
                                <option value="FELICITACION">Felicitación</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Nombre Completo</label>
                            <input type="text" name="nombre_remitente" required value={formData.nombre_remitente} onChange={handleChange} className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Correo Electrónico</label>
                            <input type="email" name="correo" required value={formData.correo} onChange={handleChange} className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Teléfono</label>
                            <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 font-bold mb-2">Asunto</label>
                        <input type="text" name="asunto" required value={formData.asunto} onChange={handleChange} className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 font-bold mb-2">Mensaje</label>
                        <textarea name="mensaje" required rows="4" value={formData.mensaje} onChange={handleChange} className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>

                    <div className="mb-8">
                        <label className="block text-gray-700 font-bold mb-2">Adjuntar Archivo (Opcional)</label>
                        <input type="file" onChange={handleFileChange} className="w-full p-2 bg-gray-50 border rounded" />
                    </div>

                    <button type="submit" disabled={status === 'loading'} className="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition">
                        {status === 'loading' ? 'Enviando...' : 'Enviar Solicitud'}
                    </button>
                </form>
            </div>
            <Footer />
        </>
    );
};

export default PQRS;