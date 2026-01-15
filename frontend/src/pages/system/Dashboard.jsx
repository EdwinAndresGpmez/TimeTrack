import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    return (
        <div>
            {/* Tarjeta de Bienvenida */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-8 text-white mb-8">
                <h1 className="text-3xl font-bold">
                    ¡Bienvenido de nuevo, {user?.nombre || 'Usuario'}!
                </h1>
                <p className="mt-2 opacity-90">
                    Tienes acceso completo a tus servicios médicos. ¿Qué deseas hacer hoy?
                </p>
            </div>

            {/* Grid de Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <h3 className="text-gray-500 font-medium text-sm">Próxima Cita</h3>
                    <p className="text-2xl font-bold text-gray-800 mt-2">-- / --</p>
                    <span className="text-xs text-blue-500 mt-1 block cursor-pointer">Ver calendario &rarr;</span>
                </div>
                {/* ... más widgets ... */}
            </div>
        </div>
    );
};

export default Dashboard;