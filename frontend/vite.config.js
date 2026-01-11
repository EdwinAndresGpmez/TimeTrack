import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,      // Necesario para Docker
    port: 5173,      // Puerto estándar de Vite
    watch: {
      usePolling: true // Necesario en Windows para que detecte cambios en vivo
    }
  }
})