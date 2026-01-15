import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const PrivateRoute = () => {
    const { user, loading } = useContext(AuthContext);

    // 1. Mientras verifica el token, mostramos un spinner simple
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
            </div>
        );
    }

    // 2. Si no hay usuario (no logueado), redirigir a Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Si hay usuario, renderizar la ruta hija (El Dashboard)
    return <Outlet />;
};

export default PrivateRoute;