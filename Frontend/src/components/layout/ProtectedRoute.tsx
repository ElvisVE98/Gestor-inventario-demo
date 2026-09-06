/**
 * ProtectedRoute.tsx
 *
 * Guarda de rutas que requieren autenticación.
 * Se coloca en App.tsx envolviendo todas las rutas privadas.
 *
 * Tres estados posibles:
 *   1. isLoading = true  → mostramos nada (evita flash de redirección)
 *   2. No hay usuario    → redirigimos a /login
 *   3. Hay usuario       → renderizamos las rutas hijas con <Outlet />
 *
 * Por qué chequear isLoading antes de redirigir:
 *   Al cargar la app, AuthContext tarda un render en leer localStorage.
 *   Si redirigimos inmediatamente cuando usuario=null, el usuario autenticado
 *   vería un flash hacia /login antes de que se restaure su sesión.
 *   Esperar a que isLoading=false garantiza que la decisión se toma
 *   con la información completa.
 */

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Componente de ruta protegida.
 * Renderiza <Outlet /> (las rutas hijas) si hay sesión activa.
 * Redirige a /login si no hay sesión.
 */
export default function ProtectedRoute() {
  const { usuario, isLoading } = useAuth()

  // Mientras AuthContext verifica localStorage, no renderizamos nada.
  // Un null aquí es invisible — no hay flash ni contenido incorrecto.
  if (isLoading) {
    return null
  }

  // Sin usuario autenticado → mandamos a login.
  // replace=true evita que /login quede en el historial de navegación,
  // así el botón "atrás" del navegador no vuelve a una página protegida.
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  // Sesión válida → renderizamos las rutas hijas definidas en App.tsx
  return <Outlet />
}
