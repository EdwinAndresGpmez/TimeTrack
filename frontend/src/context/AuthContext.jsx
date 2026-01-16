import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);       // <--- NUEVO: Para ProtectedRoute (['admin', 'paciente'])
    const [permisos, setPermisos] = useState([]); // <--- NUEVO: Para Menú Dinámico (['ver_dashboard', ...])
    const [loading, setLoading] = useState(true);

    // --- FUNCIÓN AUXILIAR PARA TRAER DATOS DEL BACKEND ---
    const fetchRolesYPermisos = async () => {
        try {
            // Llamamos al endpoint que ajustamos en la vista MisPermisosView
            // Nota: Asegúrate de tener esta función en authService (ver abajo)
            const data = await authService.getMisPermisos();
            
            // Aquí aplicamos la lógica que pediste:
            setPermisos(data.codenames); // Para pintar el menú
            setRoles(data.roles);        // Para proteger rutas
            
            // Opcional: Si quieres guardar si es staff/superuser en el user
            if (user) {
                setUser(prev => ({ ...prev, is_superuser: data.is_superuser, is_staff: data.is_staff }));
            }
        } catch (error) {
            console.error("Error cargando roles y permisos:", error);
            // Si falla esto, es mejor cerrar sesión por seguridad o dejar roles vacíos
        }
    };

    // --- VERIFICAR SESIÓN AL CARGAR PÁGINA ---
    useEffect(() => {
        const checkSession = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    // Verificamos expiración
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        setUser(decoded);
                        // IMPORTANTE: Una vez tenemos el token, pedimos los permisos
                        await fetchRolesYPermisos(); 
                    }
                } catch (error) {
                    console.error("Token inválido", error);
                    logout();
                }
            }
            setLoading(false);
        };
        checkSession();
    }, []);

    // --- INICIAR SESIÓN ---
    const login = async (credentials) => {
        try {
            // 1. Login normal (obtiene token)
            const data = await authService.login(credentials);
            
            if (data.access) {
                const decoded = jwtDecode(data.access);
                setUser(decoded);
                
                // 2. IMPORTANTE: Inmediatamente después del login, traemos los permisos
                // Esperamos a que termine para asegurar que al redirigir ya tengamos los roles
                await fetchRolesYPermisos(); 
                
                return true;
            }
        } catch (error) {
            throw error;
        }
    };

    // --- CERRAR SESIÓN ---
    const logout = () => {
        authService.logout();
        setUser(null);
        setRoles([]);     // <--- Limpiamos roles
        setPermisos([]);  // <--- Limpiamos permisos
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            logout, 
            loading,
            roles,      // <--- Exportamos roles para usar en ProtectedRoute
            permisos    // <--- Exportamos permisos para el Menú
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};