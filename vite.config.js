import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'process.env': {},
  },
  server: {
    host: 'localhost',
    port: 5173,
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5000 http://localhost:5173 http://127.0.0.1:5173 ws: wss:; img-src 'self' data: blob: http://localhost:5000 https://libralink-50ig.onrender.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' http://localhost:5000 http://localhost:5173 http://127.0.0.1:5173 ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 http://127.0.0.1:5173;"
    }
  },
  preview: {
    host: 'localhost',
    port: 4173,
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5000 http://localhost:5173 http://127.0.0.1:5173 ws: wss:; img-src 'self' data: blob: http://localhost:5000 https://libralink-50ig.onrender.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' http://localhost:5000 http://localhost:5173 http://127.0.0.1:5173 ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 http://127.0.0.1:5173;"
    }
  }
})