import { useState } from 'react';
import { useAuth } from '../context/AuthContext'; // Importamos nuestro hook
import { useNavigate } from 'react-router-dom';
import { 
  Container, Box, TextField, Button, Typography, Alert, Paper 
} from '@mui/material';

const Login = () => {
  const [documento, setDocumento] = useState(''); // Estado local para el input
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useAuth(); // Sacamos la función login del contexto
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Ejecutamos la lógica del Context
    const result = await login(documento, password);
    
    if (result.success) {
      // Si todo sale bien, React Router nos lleva al dashboard
      navigate('/dashboard'); 
    } else {
      setError(result.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            TimeTrack
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Sistema de Gestión
          </Typography>
          
          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="documento"
              label="Documento de Identidad"
              name="documento"
              autoComplete="username"
              autoFocus
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              Ingresar
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;