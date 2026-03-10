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

    // 1. Validar Login
    if (!user) return <Navigate to="/login" replace />;

    // 2. Superusuario siempre tiene acceso
    if (user.is_superuser) return children ? children : <Outlet />;

    // 3. Validación por ROL (Nuevo: Más fácil para reglas generales)
    // Ejemplo: requiredRole="Paciente"
    if (requiredRole) {
        // Normalizamos a minúsculas para evitar errores de tipeo (backend suele enviar nombres exactos)
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

    // 4. Validación por PERMISO (Granular: Para reglas específicas)
    // Ejemplo: requiredPermission="modulo_agendamiento"
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

    // 5. Validación por FEATURE del plan (tenant policy)
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

    // Si pasó todas las validaciones (o no se requirió ninguna específica), adelante.
    return children ? children : <Outlet />;
};

export default ProtectedRoute;
