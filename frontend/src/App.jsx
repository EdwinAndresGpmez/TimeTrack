import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Routes>
      {/* Ruta Pública: Login */}
      <Route path="/login" element={<Login />} />

      {/* Ruta Privada: Dashboard (Protegida por PrivateRoute) */}
      <Route 
        path="/dashboard" 
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } 
      />

      {/* Redirección por defecto: Si entra a la raíz, intentar ir al dashboard */}
      {/* Si no está logueado, el PrivateRoute lo mandará al login automáticamente */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;