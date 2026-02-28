import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Importaciones de Páginas Públicas
import Home from './pages/portal/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PQRS from './pages/portal/PQRS'; 
import TrabajeConNosotros from './pages/portal/TrabajeConNosotros'; 

// Importaciones de Páginas Privadas
import PrivateRoute from './components/auth/PrivateRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/system/DashboardLayout';
import Dashboard from './pages/system/Dashboard';
import MisCitas from './pages/system/MisCitas';
import NuevaCita from './pages/system/NuevaCita';
import Perfil from './pages/system/Perfil';
import AgendarCitaAdmin from './pages/admin/AgendarCitaAdmin';
import AdminCitas from './pages/admin/AdminCitas';
import ConfiguracionSistema from './pages/admin/ConfiguracionSistema';
import ValidarUsuarios from './pages/admin/ValidarUsuarios';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import GestionPacientes from './pages/admin/GestionPacientes';
import AdminProfesionales from './pages/admin/AdminProfesionales';
import AdminParametricas from './pages/admin/AdminParametricas';
import GestionAgenda from './pages/admin/agenda/GestionAgenda';
import RecepcionConsultorio from './pages/system/RecepcionConsultorio';

// ---> NUEVAS PÁGINAS OPERATIVAS <---
import DashboardProfesional from './pages/system/DashboardProfesional';
import SalaEsperaPantalla from './pages/system/SalaEsperaPantalla';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- RUTAS PÚBLICAS --- */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pqrs" element={<PQRS />} />
          <Route path="/trabaje-con-nosotros" element={<TrabajeConNosotros />} />
          
          {/* --- RUTAS PRIVADAS --- */}
          <Route element={<PrivateRoute />}>
             
             {/* 1. RUTA ESPECIAL: PANTALLA DE SALA (Sin Layout, Pantalla Completa) */}
             <Route path="/sala-espera" element={
                <ProtectedRoute requiredPermission="acceso_pantalla_sala">
                    <SalaEsperaPantalla />
                </ProtectedRoute>
             } />

             {/* 2. RUTAS CON DASHBOARD LAYOUT (Sidebar + Header) */}
             <Route element={<DashboardLayout />}>
                 
                 <Route path="/dashboard" element={<Dashboard />} />
                 <Route path="/dashboard/perfil" element={<Perfil />} />
                 
                 {/* --- MÓDULOS DE PACIENTE --- */}
                 <Route path="/dashboard/citas" element={
                    <ProtectedRoute requiredPermission="acceso_mis_citas">
                        <MisCitas />
                    </ProtectedRoute>
                 } />
                 
                 <Route path="/dashboard/citas/nueva" element={
                    <ProtectedRoute requiredPermission="nuevas_citas">
                        <NuevaCita />
                    </ProtectedRoute>
                 } />

                 {/* --- MÓDULO MÉDICO OPERATIVO --- */}
                 <Route path="/dashboard/doctor/atencion" element={
                    <ProtectedRoute requiredPermission="atencion_consultorio">
                        <DashboardProfesional />
                    </ProtectedRoute>
                 } />

                 {/* --- ZONA ADMINISTRATIVA --- */}
                 <Route path="/dashboard/admin/configuracion" element={
                    <ProtectedRoute requiredPermission="config_sistema">
                        <ConfiguracionSistema />
                    </ProtectedRoute>
                 } />

                 <Route path="/dashboard/admin/validar-usuarios" element={
                    <ProtectedRoute requiredPermission="validar_pacientes">
                        <ValidarUsuarios />
                    </ProtectedRoute>
                 } />

                 <Route path="/dashboard/agendar-admin" element={
                    <ProtectedRoute requiredPermission="agendar_admin">
                        <AgendarCitaAdmin />
                    </ProtectedRoute>
                 } />

                 <Route path="/dashboard/admin/pacientes" element={
                    <ProtectedRoute requiredPermission="gestion_pacientes">
                        <GestionPacientes />
                    </ProtectedRoute>
                 } />

                 <Route path="/dashboard/admin/usuarios" element={
                    <ProtectedRoute requiredPermission="gestion_usuarios">
                        <AdminUsuarios />
                    </ProtectedRoute>
                 } />

                 <Route path="/dashboard/admin/parametricas" element={
                    <ProtectedRoute requiredPermission="admin_parametricas">
                        <AdminParametricas />
                    </ProtectedRoute>
                 } />

                 <Route path="/dashboard/admin/profesionales" element={
                    <ProtectedRoute requiredPermission="admin_profesionales">
                        <AdminProfesionales />
                    </ProtectedRoute>
                 } />

                 <Route path="/dashboard/admin/citas" element={
                    <ProtectedRoute requiredPermission="admin_citas">
                        <AdminCitas />
                    </ProtectedRoute>
                 } />

                 <Route path="/dashboard/admin/agenda" element={
                    <ProtectedRoute requiredPermission="gestion_agenda">
                        <GestionAgenda />
                    </ProtectedRoute>
                 } />

                 <Route path="/dashboard/admin/recepcion" element={
                    <ProtectedRoute requiredPermission="recepcion_sala">
                        <RecepcionConsultorio />
                    </ProtectedRoute>
                 } />
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