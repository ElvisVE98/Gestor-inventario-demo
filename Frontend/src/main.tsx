/**
 * main.tsx
 *
 * Punto de entrada de la aplicación React.
 * Monta el componente raíz <App /> en el div#root del index.html.
 * StrictMode activa advertencias adicionales en desarrollo para detectar
 * problemas potenciales antes de llegar a producción.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
