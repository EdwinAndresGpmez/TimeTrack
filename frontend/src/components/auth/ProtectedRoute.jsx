import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import useTenantPolicy from '../../hooks/useTenantPolicy';

const ProtectedRoute = ({ children, requiredPermission, requiredRole, requiredFeature }) => {
    const { user, loading, permissions } = useContext(AuthContext);
    const { loading: policyLoading, hasFeature } = useTenantPolicy();

    if (loading || policyLoading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="ml-3 font-bold text-gray-500">Verificando seguridad...</span>
        </div>
    );

    if (!user) return <Navigate to="/login" replace />;

    if (user.is_superuser) return children ? children : <Outlet />;

    if (requiredRole) {
        const rolesUsuario = (permissions?.roles || []).map(r => r.toLowerCase());
        const tieneRol = rolesUsuario.includes(requiredRole.toLowerCase());

        if (!tieneRol) {
            Swal.fire({
                icon: 'warning',
                title: 'Se requiere otro perfil',
                text: `Esta sección es exclusiva para usuarios con perfil: ${requiredRole}`,
                timer: 2500,
                showConfirmButton: false
            });
            return <Navigate to="/dashboard" replace />;
        }
    }

    if (requiredPermission) {
        const listaPermisos = permissions?.codenames || [];
        const tieneAcceso = listaPermisos.includes(requiredPermission);

        if (!tieneAcceso) {
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: 'No tienes los permisos asignados para esta operación.',
                timer: 2000,
                showConfirmButton: false
            });
            return <Navigate to="/dashboard" replace />;
        }
    }

    if (requiredFeature) {
        const enabled = hasFeature(requiredFeature);
        if (!enabled) {
            Swal.fire({
                icon: 'info',
                title: 'Funcionalidad no incluida en tu plan',
                text: `Esta sección requiere el módulo: ${requiredFeature}`,
                timer: 2600,
                showConfirmButton: false
            });
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;

