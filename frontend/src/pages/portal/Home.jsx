import React from 'react';
import Navbar from '../../components/portal/Navbar';
import HeroSlider from '../../components/portal/HeroSlider';
import AboutSection from '../../components/portal/AboutSection'; // Nuevo
import ServicesGrid from '../../components/portal/ServicesGrid';
import Footer from '../../components/portal/Footer';

const Home = () => {
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
                    <a href="https://timetrack.ldtp.com/" target="_blank" className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold text-lg transition inline-block">
                        Agendar Cita Ahora
                    </a>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;