import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

// Tema básico (puedes personalizar colores aquí luego)
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f4f6f8' },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* Normaliza CSS del navegador */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)