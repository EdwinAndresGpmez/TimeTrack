import { useAuth } from '../context/AuthContext';
import { Button, Container, Typography, Box } from '@mui/material';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        ¡Bienvenido al Dashboard! 🏥
      </Typography>
      
      <Box sx={{ p: 3, bgcolor: '#e3f2fd', borderRadius: 2, mb: 3 }}>
        <Typography variant="body1">
          <strong>Usuario conectado:</strong> {user?.nombre}
        </Typography>
        <Typography variant="body1">
          <strong>Documento:</strong> {user?.documento}
        </Typography>
        <Typography variant="body1">
          <strong>Roles:</strong> {user?.roles?.join(', ') || 'Sin roles'}
        </Typography>
      </Box>

      <Button variant="contained" color="error" onClick={logout}>
        Cerrar Sesión
      </Button>
    </Container>
  );
};

export default Dashboard;