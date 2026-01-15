import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBars, FaTimes, FaPhone, FaWhatsapp } from 'react-icons/fa';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="bg-white shadow-md fixed w-full z-50 top-0">
            {/* Barra Superior de Contacto */}
            <div className="bg-blue-900 text-white text-sm py-2 hidden md:block">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-2"><FaPhone /> (606) 840 4873</span>
                        <span className="flex items-center gap-2"><FaWhatsapp /> 311 608 4053</span>
                    </div>
                    <div>
                        Calle 12 # 6 - 25, Chinchiná Caldas
                    </div>
                </div>
            </div>

            {/* Navegación Principal */}
            <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
                {/* Logo */}
                <Link to="/" className="text-2xl font-bold text-blue-800">
                    TimeTrack<span className="text-green-500">Medical</span>
                </Link>

                {/* Menú Desktop */}
                <div className="hidden md:flex gap-6 items-center font-medium text-gray-700">
                    <Link to="/" className="hover:text-blue-600 transition">Inicio</Link>
                    <Link to="/servicios" className="hover:text-blue-600 transition">Servicios</Link>
                    <Link to="/pqrs" className="hover:text-blue-600 transition">PQRS</Link>
                    <Link to="/trabaja-con-nosotros" className="hover:text-blue-600 transition">Trabaje con Nosotros</Link>
                    
                    {/* Botón Agendar (Lleva al Login por ahora) */}
                    <Link to="/login" className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition shadow-lg">
                        Agendar Cita
                    </Link>
                </div>

                {/* Botón Móvil */}
                <button className="md:hidden text-2xl text-blue-900" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <FaTimes /> : <FaBars />}
                </button>
            </nav>

            {/* Menú Móvil Desplegable */}
            {isOpen && (
                <div className="md:hidden bg-white border-t p-4 flex flex-col gap-4 shadow-xl">
                    <Link to="/" onClick={() => setIsOpen(false)}>Inicio</Link>
                    <Link to="/servicios" onClick={() => setIsOpen(false)}>Servicios</Link>
                    <Link to="/pqrs" onClick={() => setIsOpen(false)}>PQRS</Link>
                    <Link to="/login" className="text-blue-600 font-bold" onClick={() => setIsOpen(false)}>
                        Agendar Cita
                    </Link>
                </div>
            )}
        </header>
    );
};

export default Navbar;