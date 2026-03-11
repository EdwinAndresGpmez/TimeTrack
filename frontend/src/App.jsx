import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider, useUI } from './context/UIContext';

import Home from './pages/portal/Home';
import SaasLanding from './pages/portal/SaasLanding';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PQRS from './pages/portal/PQRS';
import TrabajeConNosotros from './pages/portal/TrabajeConNosotros';
import SaasSignup from './pages/portal/SaasSignup';

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
import DashboardProfesional from './pages/system/DashboardProfesional';
import SalaEsperaPantalla from './pages/system/SalaEsperaPantalla';
import Auditoria from './pages/admin/Auditoria';
import AdminPortalContentStudio from './pages/admin/AdminPortalContentStudio';
import AdminPQRSGestion from './pages/admin/AdminPQRSGestion';
import AdminConvocatoriasGestion from './pages/admin/AdminConvocatoriasGestion';
import AdminTenants from './pages/admin/AdminTenants';
import ConfiguracionInicialClinica from './pages/admin/ConfiguracionInicialClinica';
import AdminGuideContent from './pages/admin/AdminGuideContent';

const AppRoutes = () => {
    const { t } = useUI();

    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<SaasLanding />} />
                    <Route path="/t/:tenantSlug" element={<Home />} />
                    <Route path="/t/:tenantSlug/pqrs" element={<PQRS />} />
                    <Route path="/t/:tenantSlug/trabaje-con-nosotros" element={<TrabajeConNosotros />} />
                    <Route path="/pqrs" element={<Navigate to="/" replace />} />
                    <Route path="/trabaje-con-nosotros" element={<Navigate to="/" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/saas/signup" element={<SaasSignup />} />

                    <Route element={<PrivateRoute />}>
                        <Route
                            path="/sala-espera"
                            element={(
                                <ProtectedRoute requiredPermission="acceso_pantalla_sala">
                                    <SalaEsperaPantalla />
                                </ProtectedRoute>
                            )}
                        />

                        <Route element={<DashboardLayout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/dashboard/perfil" element={<Perfil />} />

                            <Route
                                path="/dashboard/citas"
                                element={(
                                    <ProtectedRoute requiredPermission="acceso_mis_citas">
                                        <MisCitas />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/citas/nueva"
                                element={(
                                    <ProtectedRoute requiredPermission="nuevas_citas">
                                        <NuevaCita />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/doctor/atencion"
                                element={(
                                    <ProtectedRoute requiredPermission="atencion_consultorio" requiredFeature="agenda_basica">
                                        <DashboardProfesional />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/configuracion"
                                element={(
                                    <ProtectedRoute requiredPermission="config_sistema">
                                        <ConfiguracionSistema />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/validar-usuarios"
                                element={(
                                    <ProtectedRoute requiredPermission="validar_pacientes">
                                        <ValidarUsuarios />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/agendar-admin"
                                element={(
                                    <ProtectedRoute requiredPermission="agendar_admin">
                                        <AgendarCitaAdmin />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/pacientes"
                                element={(
                                    <ProtectedRoute requiredPermission="gestion_pacientes" requiredFeature="registro_pacientes">
                                        <GestionPacientes />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/usuarios"
                                element={(
                                    <ProtectedRoute requiredPermission="gestion_usuarios">
                                        <AdminUsuarios />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/parametricas"
                                element={(
                                    <ProtectedRoute requiredPermission="admin_parametricas">
                                        <AdminParametricas />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/profesionales"
                                element={(
                                    <ProtectedRoute requiredPermission="admin_profesionales">
                                        <AdminProfesionales />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/citas"
                                element={(
                                    <ProtectedRoute requiredPermission="admin_citas" requiredFeature="agenda_basica">
                                        <AdminCitas />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/agenda"
                                element={(
                                    <ProtectedRoute requiredPermission="gestion_agenda" requiredFeature="agenda_basica">
                                        <GestionAgenda />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/admin/portal/content"
                                element={(
                                    <ProtectedRoute requiredPermission="portal_content_admin" requiredFeature="portal_web_completo">
                                        <AdminPortalContentStudio />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/recepcion"
                                element={(
                                    <ProtectedRoute requiredPermission="recepcion_sala" requiredFeature="agenda_basica">
                                        <RecepcionConsultorio />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/auditoria"
                                element={(
                                    <ProtectedRoute requiredPermission="admin_auditoria">
                                        <Auditoria />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/pqrs-gestion"
                                element={(
                                    <ProtectedRoute requiredPermission="admin_pqrs_gestion" requiredFeature="pqrs">
                                        <AdminPQRSGestion />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/convocatorias-gestion"
                                element={(
                                    <ProtectedRoute requiredPermission="admin_convocatorias_gestion" requiredFeature="portal_web_completo">
                                        <AdminConvocatoriasGestion />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/tenants"
                                element={(
                                    <ProtectedRoute requiredPermission="saas_tenants_admin" requiredFeature="api_publica">
                                        <AdminTenants />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/guia-ayuda"
                                element={(
                                    <ProtectedRoute requiredPermission="saas_guide_content_admin" requiredFeature="api_publica">
                                        <AdminGuideContent />
                                    </ProtectedRoute>
                                )}
                            />

                            <Route
                                path="/dashboard/admin/configuracion-inicial"
                                element={(
                                    <ProtectedRoute requiredRole="Administrador">
                                        <ConfiguracionInicialClinica />
                                    </ProtectedRoute>
                                )}
                            />
                        </Route>
                    </Route>

                    <Route
                        path="*"
                        element={<div className="p-20 text-center font-bold text-gray-600 dark:text-gray-200">{t('noPageFound')}</div>}
                    />
                </Routes>

            </BrowserRouter>
        </AuthProvider>
    );
};

function App() {
    return (
        <UIProvider>
            <AppRoutes />
        </UIProvider>
    );
}

export default App;

