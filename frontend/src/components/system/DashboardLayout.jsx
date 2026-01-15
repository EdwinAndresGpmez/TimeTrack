import React, { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom'; 
import { AuthContext } from '../../context/AuthContext'; // Verifica que esta ruta sea correcta para tu proyecto
import Sidebar from './Sidebar'; // Importa el Sidebar que está AL LADO
import { FaBars } from 'react-icons/fa';

const DashboardLayout = () => {
    const { logout, user } = useContext(AuthContext);
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar isOpen={isSidebarOpen} logout={logout} />

            <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
                
                <header className="bg-white shadow-sm h-20 flex items-center justify-between px-8 sticky top-0 z-40">
                    <button 
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="text-gray-600 hover:text-blue-900 text-2xl focus:outline-none"
                    >
                        <FaBars />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="font-bold text-gray-800">{user?.nombre}</p>
                            <p className="text-xs text-gray-500 uppercase">{user?.roles?.[0] || 'Usuario'}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold border-2 border-white shadow-sm">
                            {user?.nombre?.charAt(0) || 'U'}
                        </div>
                    </div>
                </header>

                <main className="p-8">
                    <Outlet /> 
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;