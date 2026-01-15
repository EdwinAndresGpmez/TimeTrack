import React from 'react';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { FaCheckCircle } from 'react-icons/fa';

const StatItem = ({ end, label, suffix = "+" }) => {
    const { ref, inView } = useInView({ triggerOnce: true });
    return (
        <div ref={ref} className="text-center p-6 border border-gray-100 rounded-lg bg-white shadow-sm hover:shadow-md transition">
            <h3 className="text-4xl font-bold text-blue-600 mb-2">
                {inView ? <CountUp end={end} duration={2.5} /> : '0'}{suffix}
            </h3>
            <p className="text-gray-600 font-medium">{label}</p>
        </div>
    );
};

const AboutSection = () => {
    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Texto */}
                    <div>
                        <span className="text-blue-600 font-bold uppercase tracking-wider text-sm">Sobre Nosotros</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                            Cuidamos de Ti con <span className="text-green-500">Excelencia y Calidez</span>
                        </h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            Somos una institución dedicada a ofrecer servicios de salud integrales, combinando tecnología de punta con un enfoque humano. Nuestro equipo de especialistas trabaja para garantizar tu bienestar.
                        </p>
                        
                        <div className="space-y-3 mb-8">
                            {[
                                "Prevención y Promoción de la Salud",
                                "Diagnóstico y Tratamiento Oportuno",
                                "Atención Humanizada",
                                "Confianza y Experiencia"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <FaCheckCircle className="text-green-500 text-xl" />
                                    <span className="text-gray-700 font-medium">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 gap-6">
                        <StatItem end={17} label="Años de Experiencia" />
                        <StatItem end={40} label="Médicos y Personal" />
                        <StatItem end={6000} label="Pacientes Felices" />
                        <StatItem end={8} label="Convenios Médicos" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutSection;