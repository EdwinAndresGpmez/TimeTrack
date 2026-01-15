import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- Importamos esto

const TermsModal = ({ isOpen, onAccept }) => {
    const [isChecked, setIsChecked] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Bloquear el scroll del cuerpo cuando el modal está abierto
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    // El contenido del modal
    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Fondo Oscuro (Overlay) */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />

            {/* Contenedor del Modal - AHORA SÍ SE VERÁ ANCHO */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-gray-200 animate-scale-in">
                
                {/* Encabezado Azul */}
                <div className="bg-blue-900 text-white px-6 py-4 md:px-10 md:py-6 shrink-0 flex justify-between items-center shadow-md z-10">
                    <div>
                        <h2 className="text-xl md:text-3xl font-bold">Términos y Condiciones</h2>
                        <p className="text-blue-200 text-sm mt-1">Política de Tratamiento de Datos Personales</p>
                    </div>
                    {/* Logo pequeño opcional o icono */}
                    <div className="bg-white/10 p-2 rounded-full">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                </div>

                {/* Cuerpo del Texto - Diseño a dos columnas en pantallas grandes */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-gray-700 text-sm md:text-base leading-relaxed">
                        
                        {/* Columna Izquierda */}
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-blue-900 font-bold text-lg mb-2 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    Responsable del Tratamiento
                                </h3>
                                <p className="text-justify bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                    Los datos personales proporcionados serán tratados por <strong>Servicios Asociados Integrados</strong> con el objetivo de actualizar y registrar su información en nuestro sistema de gestión clínica y administrativa, garantizando la confidencialidad y seguridad de la información.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-blue-900 font-bold text-lg mb-2 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    Finalidad de la Recolección
                                </h3>
                                <ul className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm list-disc pl-5 space-y-2">
                                    <li>Gestión administrativa de pacientes y agendamiento de citas médicas.</li>
                                    <li>Envío de notificaciones, recordatorios de citas y resultados de laboratorio.</li>
                                    <li>Cumplimiento de la normativa de salud pública y reportes obligatorios a entes de control.</li>
                                    <li>Mejoramiento continuo de la calidad en la prestación del servicio.</li>
                                </ul>
                            </section>
                        </div>

                        {/* Columna Derecha */}
                        <div className="space-y-6">
                            <section>
                                <h3 className="text-blue-900 font-bold text-lg mb-2 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                    Derechos del Titular
                                </h3>
                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                    <p className="mb-2">De acuerdo con la <strong>Ley 1581 de 2012</strong>, usted tiene derecho a:</p>
                                    <ul className="list-check pl-2 space-y-1 text-gray-600">
                                        <li className="flex gap-2"><span className="text-green-500">✓</span> Conocer, actualizar y rectificar sus datos.</li>
                                        <li className="flex gap-2"><span className="text-green-500">✓</span> Solicitar prueba de la autorización.</li>
                                        <li className="flex gap-2"><span className="text-green-500">✓</span> Revocar la autorización y/o solicitar supresión.</li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-blue-900 font-bold text-lg mb-2 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                                    Canales de Atención
                                </h3>
                                <p className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-800">
                                    Para ejercer sus derechos, puede contactarnos a través del correo: <br/>
                                    <strong>gerencia@serviciosasociadosintegrados.com</strong><br/>
                                    o acercándose a nuestra sede física.
                                </p>
                            </section>
                            
                            <div className="text-xs text-gray-400 mt-4 italic">
                                * Sus datos no serán compartidos con terceros con fines comerciales sin su autorización expresa.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pie de página (Barra de Acción) */}
                <div className="bg-white border-t border-gray-200 p-4 md:p-6 shrink-0 flex flex-col md:flex-row justify-between items-center gap-4 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                    
                    <label className="flex items-start md:items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition w-full md:w-auto">
                        <div className="relative flex items-center mt-1 md:mt-0">
                            <input 
                                type="checkbox" 
                                className="peer h-6 w-6 cursor-pointer appearance-none rounded border-2 border-gray-300 checked:border-blue-600 checked:bg-blue-600 transition-all"
                                checked={isChecked}
                                onChange={(e) => setIsChecked(e.target.checked)}
                            />
                            <svg className="absolute w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100 top-1 left-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="text-sm md:text-lg text-gray-700 select-none group-hover:text-blue-900">
                            Confirmo que he leído y <span className="font-bold">acepto</span> los términos y condiciones.
                        </div>
                    </label>
                    
                    <button 
                        onClick={() => onAccept(true)}
                        disabled={!isChecked}
                        className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold text-base md:text-lg tracking-wide transition-all duration-300 transform ${
                            isChecked 
                            ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-105' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        ACEPTAR Y CONTINUAR
                    </button>
                </div>
            </div>
        </div>
    );

    // USAMOS EL PORTAL PARA SACARLO DEL FLUJO DEL PADRE
    return createPortal(modalContent, document.body);
};

export default TermsModal;