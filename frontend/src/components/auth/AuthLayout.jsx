import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, title }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center relative overflow-hidden font-sans">
            
            {/* Formas decorativas (Círculos flotantes) */}
            <div className="absolute top-[10%] left-[80%] w-24 h-24 bg-white/10 rounded-full blur-sm animate-float"></div>
            <div className="absolute bottom-[5%] left-[10%] w-64 h-64 bg-white/10 rounded-full blur-sm animate-float-delayed"></div>

            {/* Tarjeta Principal */}
            <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 mx-4 border border-white/50">
                <div className="text-center mb-6">
                    {/* Asegúrate de tener tu logo en public/ o src/assets/ */}
                    <h2 className="text-3xl font-bold text-blue-900 mb-2">TimeTrack</h2>
                    <h3 className="text-xl font-semibold text-gray-700">{title}</h3>
                </div>

                {children}

                {/* Pie de página común */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    <Link to="/" className="text-blue-500 hover:underline">
                        &larr; Volver al Portal
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;