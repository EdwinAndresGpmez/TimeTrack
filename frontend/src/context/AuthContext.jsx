import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Aquí guardaremos los datos del usuario (nombre, rol, etc.)
    const [loading, setLoading] = useState(true); // Para no mostrar la app hasta verificar si hay sesión guardada

    // Al cargar la página, verificamos si hay un token guardado
    useEffect(() => {
        const checkSession = () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    // Verificamos si el token expiró (exp viene en segundos)
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        setUser(decoded); // Guardamos la info decodificada del token
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

    // Función para Iniciar Sesión (La usará Login.jsx)
    const login = async (credentials) => {
        try {
            // 1. Llamamos al servicio (que habla con Django)
            const data = await authService.login(credentials);
            
            // 2. Si el backend responde ok, decodificamos el token access
            if (data.access) {
                const decoded = jwtDecode(data.access);
                setUser(decoded); // ¡Aquí es donde el front se entera de quién eres!
                return true;
            }
        } catch (error) {
            throw error;
        }
    };

    // Función para Salir (La usará el Navbar)
    const logout = () => {
        authService.logout(); // Limpia localStorage
        setUser(null); // Limpia estado
        window.location.href = '/login'; // Fuerza recarga hacia login
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};