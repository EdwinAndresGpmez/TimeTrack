import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Públicas
import Home from './pages/portal/Home';
import PQRS from './pages/portal/PQRS';
import TrabajeConNosotros from './pages/portal/TrabajeConNosotros';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Privadas y Seguridad
import PrivateRoute from './components/auth/PrivateRoute';
import Dashboard from './pages/system/Dashboard';
import DashboardLayout from './components/system/DashboardLayout';
import MisCitas from './pages/system/MisCitas';
import NuevaCita from './pages/system/NuevaCita';
import ConfiguracionSistema from './pages/admin/ConfiguracionSistema';
import Perfil from './pages/system/Perfil';

// Placeholders
const Servicios = () => <div className="p-20 text-center text-2xl font-bold text-blue-900">Servicios</div>;
const ForgotPassword = () => <div className="p-20 text-center text-2xl font-bold text-blue-900">Recuperar Contraseña</div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- RUTAS PÚBLICAS --- */}
          <Route path="/" element={<Home />} />
          <Route path="/pqrs" element={<PQRS />} />
          <Route path="/trabaja-con-nosotros" element={<TrabajeConNosotros />} />
          <Route path="/servicios" element={<Servicios />} />
          
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* --- RUTAS PROTEGIDAS (SISTEMA) --- */}
          {/* 1. Primero verifica seguridad (PrivateRoute) */}
          <Route element={<PrivateRoute />}>
             
             {/* 2. Si pasa seguridad, aplica el diseño con Sidebar (DashboardLayout) */}
             <Route element={<DashboardLayout />}>
                 
                 {/* 3. Renderiza la página específica */}
                 <Route path="/dashboard" element={<Dashboard />} />
                 
                 {/* Próximamente: */}
                 <Route path="/dashboard/citas" element={<MisCitas />} /> 
                 <Route path="/dashboard/citas/nueva" element={<NuevaCita />} />
                 <Route path="/dashboard/configuracion" element={<ConfiguracionSistema />} />
                 <Route path="/dashboard/perfil" element={<Perfil />} />
             
             </Route>

          </Route>

          {/* 404 */}
          <Route path="*" element={<div className="p-20 text-center font-bold text-gray-600">404 - Página no encontrada</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;