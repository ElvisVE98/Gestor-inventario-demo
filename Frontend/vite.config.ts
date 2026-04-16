/**
 * vite.config.ts
 *
 * Configuración de Vite para ti-inventario-web.
 * Registra el plugin de React (JSX + Fast Refresh) y el plugin de Tailwind CSS v4.
 * Con Tailwind v4 no hace falta tailwind.config.js — todo se maneja desde aquí y el CSS.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4: escanea los archivos y genera el CSS automáticamente
  ],
})
