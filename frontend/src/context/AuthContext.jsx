import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);      
    const [permisos, setPermisos] = useState([]); 
    const [loading, setLoading] = useState(true);

    const fetchRolesYPermisos = async () => {
        try {
            const data = await authService.getMisPermisos();
            // console.log('MisPermisos response:', data); // Descomenta para debug
            
            setPermisos(Array.isArray(data.codenames) ? data.codenames : []); 
            setRoles(Array.isArray(data.roles) ? data.roles : []);        
            
            if (user) {
                // Actualizamos estado de staff/superuser si viene del backend
                setUser(prev => ({ ...prev, is_superuser: data.is_superuser, is_staff: data.is_staff }));
            }
        } catch (error) {
            console.error("Error cargando roles y permisos:", error);
        }
    };

    useEffect(() => {
        const checkSession = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        setUser(decoded);
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

    const login = async (credentials) => {
        try {
            const data = await authService.login(credentials);
            if (data.access) {
                const decoded = jwtDecode(data.access);
                setUser(decoded);
                await fetchRolesYPermisos(); 
                return true;
            }
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        setRoles([]);    
        setPermisos([]);  
        window.location.href = '/login';
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