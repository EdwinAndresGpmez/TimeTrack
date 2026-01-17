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
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/system/Dashboard';
import DashboardLayout from './components/system/DashboardLayout';
import MisCitas from './pages/system/MisCitas';
import NuevaCita from './pages/system/NuevaCita';
import ConfiguracionSistema from './pages/admin/ConfiguracionSistema';
import Perfil from './pages/system/Perfil';
import ValidarUsuarios from './pages/admin/ValidarUsuarios';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import AdminProfesionales from './pages/admin/AdminProfesionales';
import AdminParametricas from './pages/admin/AdminParametricas';
import GestionAgenda from './pages/admin/GestionAgenda'; 
import AdminCitas from './pages/admin/AdminCitas';

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
          <Route element={<PrivateRoute />}>
             
             {/* Layout Común (Sidebar + Header) */}
             <Route element={<DashboardLayout />}>
                 
                 {/* Rutas Generales */}
                 <Route path="/dashboard" element={<Dashboard />} />
                 <Route path="/dashboard/citas" element={<MisCitas />} /> 
                 <Route path="/dashboard/citas/nueva" element={<NuevaCita />} />
                 <Route path="/dashboard/perfil" element={<Perfil />} />
                 
                 {/* --- ZONA ADMIN --- */}
                 {/* Agrupamos todas las de admin aquí */}
                 <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                     <Route path="/dashboard/configuracion" element={<ConfiguracionSistema />} />
                     <Route path="/dashboard/admin/validar-usuarios" element={<ValidarUsuarios />} />
                     <Route path="/dashboard/admin/usuarios" element={<AdminUsuarios />} />
                     <Route path="/dashboard/admin/parametricas" element={<AdminParametricas />} />
                     <Route path="/dashboard/admin/profesionales" element={<AdminProfesionales />} />
                     <Route path="/dashboard/admin/citas" element={<AdminCitas />} />
                     
                     {/* NUEVA RUTA DE AGENDA */}
                     <Route path="/dashboard/admin/agenda" element={<GestionAgenda />} />
                 </Route>
             
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