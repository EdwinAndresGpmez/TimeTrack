import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si no hay usuario, redirigir al Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario, mostrar el contenido protegido (Dashboard, etc.)
  return children;
};

export default PrivateRoute;