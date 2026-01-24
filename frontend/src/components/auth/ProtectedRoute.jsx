import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';

// allowedRoles: Array de strings. Ej: ['admin', 'paciente']
const ProtectedRoute = ({ allowedRoles = [] }) => {
    // 1. Extraemos 'roles' del contexto (ya viene de la BD)
    const { user, loading, roles } = useContext(AuthContext);

    if (loading) return <div>Verificando permisos...</div>;

    if (!user) return <Navigate to="/login" replace />;

    // 2. Si no exige roles, pasa cualquiera autenticado
    if (allowedRoles.length === 0) return <Outlet />;

    // 3. Superusuario siempre pasa (regla de oro)
    // Nota: user.is_staff viene del token decodificado, lo cual está bien.
    if (user.is_staff || user.is_superuser) return <Outlet />;

    // 4. Verificación de Roles usando la lista fresca del Contexto
    // Hacemos la comparación case-insensitive para evitar problemas de mayúsculas/minúsculas
    const rolesNormalized = Array.isArray(roles) ? roles.map(r => (r || '').toString().toLowerCase()) : [];
    const hasPermission = allowedRoles.some(role => rolesNormalized.includes((role || '').toString().toLowerCase()));

    if (!hasPermission) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Acceso Denegado',
            text: 'No tienes el rol necesario para esta sección.',
            timer: 3000,
            showConfirmButton: false
        });
        // Retornamos al dashboard si no tiene permiso
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;