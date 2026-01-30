import React, { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from "jwt-decode";
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);      
    const [permisos, setPermisos] = useState([]); 
    const [loading, setLoading] = useState(true);

    // 1. Definimos logout PRIMERO (usado en checkSession)
    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
        setRoles([]);    
        setPermisos([]);  
        window.location.href = '/login';
    }, []);

    // 2. Definimos fetchRolesYPermisos SEGUNDO
    const fetchRolesYPermisos = useCallback(async () => {
        try {
            const data = await authService.getMisPermisos();
            
            setPermisos(Array.isArray(data.codenames) ? data.codenames : []); 
            setRoles(Array.isArray(data.roles) ? data.roles : []);        
            
            // Usamos el callback del setter para asegurar que tenemos el estado más reciente
            setUser(prevUser => {
                if (prevUser) {
                    return { 
                        ...prevUser, 
                        is_superuser: data.is_superuser, 
                        is_staff: data.is_staff 
                    };
                }
                return prevUser;
            });
        } catch (error) {
            console.error("Error cargando roles y permisos:", error);
        }
    }, []);

    // 3. useEffect ahora puede ver las funciones de arriba
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
                        // Llamamos a la función estable
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
    }, [logout, fetchRolesYPermisos]); // ✅ Dependencias agregadas

    // 4. Función login simplificada (sin try/catch redundante)
    const login = async (credentials) => {
        const data = await authService.login(credentials);
        if (data.access) {
            const decoded = jwtDecode(data.access);
            setUser(decoded);
            await fetchRolesYPermisos(); 
            return true;
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            setUser, 
            login, 
            logout, 
            loading,
            permissions: {
                roles: roles,
                codenames: permisos
            }
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};