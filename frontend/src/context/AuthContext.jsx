import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode"; 
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para leer el token y actualizar el estado
  const decodeAndSetUser = (token) => {
    try {
      const decoded = jwtDecode(token);
      // AQUI EL CAMBIO: Ahora leemos 'documento' del payload del token
      // Estos datos vienen de tu 'CustomTokenObtainPairSerializer' en Python
      setUser({
        documento: decoded.documento,
        nombre: decoded.nombre,
        roles: decoded.roles,
        paciente_id: decoded.paciente_id,
        profesional_id: decoded.profesional_id
      }); 
    } catch (error) {
      console.error("Token inválido", error);
      logout();
    }
  };

  useEffect(() => {
    // Al recargar la página (F5), verificamos si hay sesión viva
    const token = localStorage.getItem('access_token');
    if (token) {
      decodeAndSetUser(token);
    }
    setLoading(false);
  }, []);

  const login = async (documento, password) => {
    try {
      // NOTA TÉCNICA IMPORTANTE:
      // Aunque tu campo en BD se llama 'documento', Django SimpleJWT por defecto
      // espera recibir una llave llamada 'username' en el JSON.
      // Por eso enviamos: { username: documento, ... }
      const response = await api.post('/auth/login/', { 
        documento: documento, 
        password: password 
      });
      
      const { access, refresh } = response.data;

      // Guardamos las llaves en el navegador
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // Actualizamos la app React
      decodeAndSetUser(access);
      
      return { success: true };
    } catch (error) {
      console.error("Error en Login:", error);
      return { 
        success: false, 
        message: JSON.stringify(error.response?.data) || "Error al iniciar sesión" 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);