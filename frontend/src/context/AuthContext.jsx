import React, { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from "jwt-decode";
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);      
    const [permisos, setPermisos] = useState([]); 
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
        setRoles([]);    
        setPermisos([]);  
        window.location.href = '/login';
    }, []);

    const fetchRolesYPermisos = useCallback(async () => {
        try {
            const data = await authService.getMisPermisos();
            
            setPermisos(Array.isArray(data.codenames) ? data.codenames : []); 
            setRoles(Array.isArray(data.roles) ? data.roles : []);        
            
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
    }, [logout, fetchRolesYPermisos]); 

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