import React, { useState } from 'react';
import Navbar from '../../components/portal/Navbar';
import Footer from '../../components/portal/Footer';
import { portalService } from '../../services/portalService';

const TrabajeConNosotros = () => {
    const [formData, setFormData] = useState({
        nombre_completo: '',
        correo: '',
        telefono: '',
        perfil_profesional: '',
        mensaje_adicional: '',
        archivo_hv: null
    });
    const [status, setStatus] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, archivo_hv: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.archivo_hv) {
            alert("Por favor adjunta tu Hoja de Vida");
            return;
        }

        setStatus('loading');
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));

        try {
            await portalService.createHV(data);
            setStatus('success');
            setFormData({ nombre_completo: '', correo: '', telefono: '', perfil_profesional: '', mensaje_adicional: '', archivo_hv: null });
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <>
            <Navbar />
            <div className="container mx-auto px-4 py-24 md:py-32 max-w-3xl">
                <h1 className="text-3xl font-bold text-blue-900 mb-6 text-center">Trabaje con Nosotros</h1>
                <p className="text-center text-gray-600 mb-8">
                    ¿Quieres ser parte de nuestro equipo? Envíanos tu hoja de vida y te tendremos en cuenta para futuras vacantes.
                </p>

                {status === 'success' && <div className="bg-green-100 text-green-700 p-4 rounded mb-4 text-center">¡Hoja de vida enviada con éxito!</div>}
                {status === 'error' && <div className="bg-red-100 text-red-700 p-4 rounded mb-4 text-center">Error al enviar. Intenta nuevamente.</div>}

                <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-xl p-8 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <input type="text" name="nombre_completo" placeholder="Nombre Completo" required value={formData.nombre_completo} onChange={handleChange} className="w-full p-3 border rounded" />
                        <input type="text" name="perfil_profesional" placeholder="Perfil (Ej: Enfermera, Médico)" required value={formData.perfil_profesional} onChange={handleChange} className="w-full p-3 border rounded" />
                        <input type="email" name="correo" placeholder="Correo Electrónico" required value={formData.correo} onChange={handleChange} className="w-full p-3 border rounded" />
                        <input type="tel" name="telefono" placeholder="Teléfono" required value={formData.telefono} onChange={handleChange} className="w-full p-3 border rounded" />
                    </div>
                    <div className="mb-6">
                        <textarea name="mensaje_adicional" placeholder="Mensaje adicional o perfil resumido..." rows="3" value={formData.mensaje_adicional} onChange={handleChange} className="w-full p-3 border rounded"></textarea>
                    </div>
                    <div className="mb-8">
                        <label className="block text-gray-700 font-bold mb-2">Hoja de Vida (PDF)</label>
                        <input type="file" accept=".pdf,.doc,.docx" required onChange={handleFileChange} className="w-full p-2 bg-gray-50 border rounded" />
                    </div>
                    <button type="submit" disabled={status === 'loading'} className="w-full bg-blue-900 text-white font-bold py-3 rounded hover:bg-blue-800 transition">
                        {status === 'loading' ? 'Enviando...' : 'Postularme'}
                    </button>
                </form>
            </div>
            <Footer />
        </>
    );
};

export default TrabajeConNosotros;