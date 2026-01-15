import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // <--- IMPORTAR

// Tus páginas
import Home from './pages/portal/Home';
import PQRS from './pages/portal/PQRS';
import TrabajeConNosotros from './pages/portal/TrabajeConNosotros';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Placeholders
const Servicios = () => <div className="p-20 text-center text-2xl font-bold text-blue-900">Servicios (En construcción)</div>;
const ForgotPassword = () => <div className="p-20 text-center text-2xl font-bold text-blue-900">Recuperar Contraseña (En construcción)</div>;

function App() {
  return (
    // 1. El AuthProvider envuelve a TODO
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/pqrs" element={<PQRS />} />
          <Route path="/trabaja-con-nosotros" element={<TrabajeConNosotros />} />
          <Route path="/servicios" element={<Servicios />} />
          
          {/* Rutas de Autenticación */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* 404 */}
          <Route path="*" element={<div className="p-20 text-center font-bold text-gray-600">404 - Página no encontrada</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;