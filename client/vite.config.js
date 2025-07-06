import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      'a4a8-2401-4900-16ac-6795-88e6-7966-d968-fc81.ngrok-free.app',
      '.ngrok-free.app',
      '.ngrok.io'
    ]
  }
})
