import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FaBars, FaTimes, FaPhone, FaWhatsapp, 
    FaRobot, FaPaperPlane, FaCommentDots, FaMinus 
} from 'react-icons/fa';
import Swal from 'sweetalert2';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false); 
    const navigate = useNavigate();

    // --- CORRECCIÓN: Definir explícitamente las rutas ---
    const menuItems = [
        { label: 'Inicio', path: '/' },
        { label: 'Servicios', path: '/servicios' },
        { label: 'PQRS', path: '/pqrs' },
        { label: 'Trabaje con Nosotros', path: '/trabaje-con-nosotros' } // Coincide exacto con App.jsx
    ];

    const handleAgendarClick = (e) => {
        e.preventDefault();
        
        localStorage.setItem('intencionCita', 'PARTICULAR');

        Swal.fire({
            title: '¿Ya tienes cuenta con nosotros?',
            text: 'para agendar tu cita necesitamos identificarte',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563EB', 
            cancelButtonColor: '#10B981', 
            confirmButtonText: 'Sí, Ingresar',
            cancelButtonText: 'No, Registrarme'
        }).then((result) => {
            if (result.isConfirmed) {
                navigate('/login');
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                navigate('/register');
            }
        });
        
        setIsOpen(false);
    };

    const ChatbotDemo = () => {
        return (
            <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2 font-sans">
                {isChatOpen && (
                    <div className="bg-white w-80 h-96 rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="bg-blue-800 p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2">
                                <div className="bg-white text-blue-800 p-1.5 rounded-full">
                                    <FaRobot />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Asistente Virtual</p>
                                    <p className="text-xs text-blue-200 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> En línea
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="hover:text-gray-300">
                                <FaMinus />
                            </button>
                        </div>

                        <div className="flex-1 p-4 bg-gray-50 overflow-y-auto space-y-3">
                            <div className="flex gap-2 items-start">
                                <div className="bg-blue-100 p-2 rounded-lg rounded-tl-none text-sm text-gray-800 max-w-[85%] shadow-sm">
                                    ¡Hola! 👋 Bienvenido a Idefnova. ¿En qué puedo ayudarte hoy?
                                </div>
                            </div>
                            <div className="flex gap-2 items-end justify-end">
                                <div className="bg-blue-600 p-2 rounded-lg rounded-tr-none text-sm text-white max-w-[85%] shadow-sm">
                                    Quiero información sobre citas.
                                </div>
                            </div>
                             <div className="flex gap-2 items-start">
                                <div className="bg-blue-100 p-2 rounded-lg rounded-tl-none text-sm text-gray-800 max-w-[85%] shadow-sm">
                                    Claro, puedes agendar en el botón superior o llamarnos al (606) 840 4873.
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-white border-t flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Escribe tu consulta..." 
                                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition">
                                <FaPaperPlane className="text-sm" />
                            </button>
                        </div>
                    </div>
                )}

                <button 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`${isChatOpen ? 'bg-gray-600' : 'bg-blue-600'} text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 flex items-center justify-center relative`}
                >
                    {isChatOpen ? <FaTimes className="text-xl" /> : <FaCommentDots className="text-2xl" />}
                    
                    {!isChatOpen && (
                        <span className="absolute top-0 right-0 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </button>
            </div>
        );
    };

    return (
        <>
            <header className="bg-white/95 backdrop-blur-md shadow-md fixed w-full z-50 top-0 transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white text-xs md:text-sm py-2 hidden md:block">
                    <div className="container mx-auto px-4 flex justify-between items-center">
                        <div className="flex gap-6 font-medium">
                            <span className="flex items-center gap-2 hover:text-blue-200 cursor-pointer transition">
                                <FaPhone /> (606) 840 4873
                            </span>
                            <span className="flex items-center gap-2 hover:text-green-300 cursor-pointer transition">
                                <FaWhatsapp /> 311 608 4053
                            </span>
                        </div>
                        <div className="opacity-90">
                            🏥 Calle 12 # 6 - 25, Chinchiná Caldas
                        </div>
                    </div>
                </div>

                <nav className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
                    <Link to="/" className="text-2xl md:text-3xl font-extrabold text-blue-900 tracking-tight">
                        Idefnova<span className="text-blue-500">Medical</span>
                    </Link>

                    <div className="hidden md:flex gap-8 items-center font-medium text-gray-600">
                        {/* CORRECCIÓN: Uso del array menuItems */}
                        {menuItems.map((item, index) => (
                            <Link 
                                key={index} 
                                to={item.path} 
                                className="hover:text-blue-600 transition duration-300 relative group"
                            >
                                {item.label}
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                        ))}
                        
                        <button 
                            onClick={handleAgendarClick}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-full hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-bold text-sm shadow-md"
                        >
                            Agendar Cita
                        </button>
                    </div>

                    <button className="md:hidden text-2xl text-blue-900 p-2" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <FaTimes /> : <FaBars />}
                    </button>
                </nav>

                <div className={`md:hidden bg-white border-t overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 flex flex-col gap-4 text-center font-medium text-gray-700">
                        {/* CORRECCIÓN: Menú móvil actualizado */}
                        {menuItems.map((item, index) => (
                            <Link 
                                key={index} 
                                to={item.path} 
                                onClick={() => setIsOpen(false)} 
                                className="hover:text-blue-600"
                            >
                                {item.label}
                            </Link>
                        ))}
                        
                        <button 
                            onClick={handleAgendarClick} 
                            className="bg-blue-100 text-blue-700 font-bold py-3 rounded-lg mt-2 mx-4"
                        >
                            Agendar Cita Ahora
                        </button>
                    </div>
                </div>
            </header>

            <ChatbotDemo />
        </>
    );
};

export default Navbar;