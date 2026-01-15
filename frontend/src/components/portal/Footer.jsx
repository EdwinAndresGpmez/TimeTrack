import React from 'react';
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="bg-blue-900 text-white pt-12 pb-6">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* Columna 1 */}
                <div>
                    <h3 className="text-2xl font-bold mb-4">TimeTrack<span className="text-green-400">Medical</span></h3>
                    <p className="text-blue-200 text-sm">
                        Servicios Asociados Integrados. Tu aliado en salud con más de 17 años de experiencia cuidando de ti y tu familia.
                    </p>
                </div>

                {/* Columna 2: Contacto */}
                <div>
                    <h4 className="text-lg font-bold mb-4">Contacto</h4>
                    <ul className="text-blue-200 text-sm space-y-2">
                        <li>Calle 12 # 6 - 25, Chinchiná Caldas</li>
                        <li>(606) 840 4873</li>
                        <li>311 608 4053</li>
                        <li>gerencia@serviciosasociadosintegrados.com</li>
                    </ul>
                </div>

                {/* Columna 3: Redes */}
                <div>
                    <h4 className="text-lg font-bold mb-4">Síguenos</h4>
                    <div className="flex gap-4">
                        <a href="#" className="text-2xl hover:text-green-400 transition"><FaFacebook /></a>
                        <a href="#" className="text-2xl hover:text-green-400 transition"><FaInstagram /></a>
                        <a href="https://wa.link/ciie9a" target="_blank" className="text-2xl hover:text-green-400 transition"><FaWhatsapp /></a>
                    </div>
                </div>
            </div>
            
            <div className="border-t border-blue-800 pt-6 text-center text-sm text-blue-300">
                <p>&copy; {new Date().getFullYear()} TimeTrack Medical. Todos los derechos reservados.</p>
            </div>
        </footer>
    );
};

export default Footer;