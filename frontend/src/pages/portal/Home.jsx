import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/portal/Navbar';
import HeroSlider from '../../components/portal/HeroSlider';
import AboutSection from '../../components/portal/AboutSection';
import ServicesGrid from '../../components/portal/ServicesGrid';
import Footer from '../../components/portal/Footer';
import Swal from 'sweetalert2';

const Home = () => {
    const navigate = useNavigate();

    const handleCitaParticular = (e) => {
        e.preventDefault();
        
        // 1. Guardar Intención
        localStorage.setItem('intencionCita', 'PARTICULAR');

        // 2. Preguntar ruta (Login o Registro)
        Swal.fire({
            title: '¿Ya tienes cuenta con nosotros?',
            text: 'para agendar tu cita necesitamos identificarte', // <--- TEXTO EXACTO SOLICITADO
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#28a745',
            confirmButtonText: 'Sí, Ingresar',
            cancelButtonText: 'No, Registrarme'
        }).then((result) => {
            if (result.isConfirmed) {
                navigate('/login');
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                navigate('/register');
            }
        });
    };

    return (
        <div className="font-sans text-gray-800">
            <Navbar />
            <HeroSlider />
            <AboutSection />
            <ServicesGrid />
            
            {/* Sección CTA (Llamada a la acción) */}
            <section className="py-16 bg-blue-900 text-white text-center">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-6">¿Tu salud es tu prioridad?</h2>
                    <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
                        Agenda tu cita hoy mismo con nuestros especialistas y vive la experiencia de un servicio de salud diferente.
                    </p>
                    
                    {/* Botón con Lógica de Intención */}
                    <button 
                        onClick={handleCitaParticular}
                        className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold text-lg transition inline-block shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        Agendar Cita Ahora
                    </button>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;