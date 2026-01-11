import { useState } from 'react'
import axios from 'axios'

function App() {
  const [cedula, setCedula] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [token, setToken] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setMensaje('Conectando con el Gateway...')
    
    try {
      // Petición al Gateway (Puerto 8080)
      const response = await axios.post('http://localhost:8080/api/auth/login/', {
        cedula: cedula,
        password: password
      })

      setToken(response.data.access)
      setMensaje('✅ ¡Login Exitoso! El backend responde.')
      console.log("Token recibido:", response.data)
    } catch (error) {
      console.error(error)
      setMensaje('❌ Error: ' + (error.response?.data?.detail || 'No se pudo conectar'))
    }
  }

  return (
    <div style={{ padding: '50px', fontFamily: 'Arial' }}>
      <h1>TimeTrack - Fase Alfa</h1>
      {/* CORRECCIÓN AQUÍ: Usamos {'->'} para evitar error de sintaxis */}
      <p>Probando conexión Frontend (5173) {'->'} Gateway (8080)</p>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input 
          type="text" 
          placeholder="Cédula" 
          value={cedula} 
          onChange={(e) => setCedula(e.target.value)} 
          style={{ padding: '10px' }}
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={{ padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none' }}>
          Iniciar Sesión
        </button>
      </form>

      <div style={{ marginTop: '20px', fontWeight: 'bold' }}>
        {mensaje}
      </div>

      {token && (
        <div style={{ marginTop: '20px', wordBreak: 'break-all', background: '#f0f0f0', padding: '10px' }}>
          <strong>Tu Token JWT:</strong> <br/>
          <small>{token}</small>
        </div>
      )}
    </div>
  )
}

export default App