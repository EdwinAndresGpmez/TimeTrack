import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';

const ProtectedRoute = ({ children, requiredPermission }) => {
    const { user, loading, permissions } = useContext(AuthContext);

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="ml-3 font-bold text-gray-500">Verificando seguridad...</span>
        </div>
    );

    if (!user) return <Navigate to="/login" replace />;

    // Superusuario siempre tiene acceso
    if (user.is_superuser || user.is_staff) return children ? children : <Outlet />;

    if (requiredPermission) {
        // Obtenemos los codenames de los permisos cargados en el AuthContext
        const listaPermisos = permissions?.codenames || [];
        const tieneAcceso = listaPermisos.includes(requiredPermission);

        if (!tieneAcceso) {
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: 'No tienes los permisos asignados para esta sección.',
                timer: 2000,
                showConfirmButton: false
            });
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;