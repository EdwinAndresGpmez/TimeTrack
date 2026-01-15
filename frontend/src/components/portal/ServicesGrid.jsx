import React from 'react';
import { FaStethoscope, FaTooth, FaFlask, FaHardHat, FaUserNurse, FaNotesMedical, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const services = [
    { icon: <FaStethoscope />, title: "Medicina General", desc: "Atención primaria integral." },
    { icon: <FaTooth />, title: "Odontología", desc: "Tratamientos estéticos modernos." },
    { icon: <FaFlask />, title: "Laboratorio Clínico", desc: "Exámenes precisos y rápidos." },
    { icon: <FaHardHat />, title: "Salud Ocupacional", desc: "Exámenes de ingreso y periódicos." },
    { icon: <FaUserNurse />, title: "Enfermería", desc: "Cuidado profesional y humano." },
    { icon: <FaNotesMedical />, title: "Facturación Médica", desc: "Gestión administrativa eficiente." },
];

const ServicesGrid = () => {
    return (
        <section className="py-20 bg-gray-50 relative overflow-hidden">
            {/* Elemento decorativo de fondo */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100 rounded-full opacity-50 blur-3xl"></div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <span className="text-green-500 font-bold uppercase tracking-wider text-sm">Nuestros Servicios</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
                        Soluciones Integrales para Cada Necesidad
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((item, index) => (
                        <div key={index} className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {item.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-3">{item.title}</h3>
                            <p className="text-gray-500 mb-6">{item.desc}</p>
                            <Link to="/servicios" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800">
                                Ver más <FaArrowRight className="ml-2 text-sm" />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ServicesGrid;