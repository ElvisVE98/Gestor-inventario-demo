/**
 * App.tsx
 *
 * Define el árbol de rutas de la aplicación con React Router.
 * Envuelve todo con AuthProvider para que el estado de autenticación
 * esté disponible en cualquier componente.
 *
 * Estructura de rutas:
 *   /login          → LoginPage (pública — sin autenticación requerida)
 *   /               → ProtectedRoute → Layout → DashboardPage
 *   /personas       → ProtectedRoute → Layout → PersonasPage
 *   /personas/:id   → ProtectedRoute → Layout → PersonaDetallePage
 *   /activos                      → ProtectedRoute → Layout → ActivosPage
 *   /activos/:id                  → ProtectedRoute → Layout → ActivoDetallePage
 *   /activos/categoria/:categoria → ProtectedRoute → Layout → CategoriaActivosPage
 *   /archivo                      → ProtectedRoute → Layout → ArchivoPage
 *   /configuracion/perfil         → ProtectedRoute → Layout → PerfilPage
 *   /configuracion/usuarios       → ProtectedRoute → Layout → UsuariosPage
 *
 * ProtectedRoute verifica si hay sesión activa.
 * Si no la hay, redirige a /login automáticamente.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PersonasPage from './pages/PersonasPage'
import PersonaDetallePage from './pages/PersonaDetallePage'
import ActivosPage from './pages/ActivosPage'
import ActivoDetallePage from './pages/ActivoDetallePage'
import CategoriaActivosPage from './pages/CategoriaActivosPage'
import PerfilPage from './pages/PerfilPage'
import UsuariosPage from './pages/UsuariosPage'
import ArchivoPage from './pages/ArchivoPage'


export default function App() {
  return (
    // BrowserRouter habilita la navegación con URLs reales (sin hash)
    <BrowserRouter>
      {/*
        AuthProvider debe estar dentro de BrowserRouter porque el Sidebar
        usa useNavigate() (que requiere BrowserRouter) al hacer logout.
      */}
      <AuthProvider>
        <Routes>

          {/* ── Ruta pública ────────────────────────────────────────────── */}
          {/* /login no necesita autenticación — es donde se obtiene el token */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Rutas privadas ───────────────────────────────────────────── */}
          {/*
            ProtectedRoute verifica la sesión y renderiza <Outlet /> si hay usuario.
            Si no hay sesión, redirige a /login.
            Layout está anidado dentro para que el sidebar siempre sea visible.
          */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>

              {/* index: se activa exactamente en "/" */}
              <Route index element={<DashboardPage />} />

              {/* Módulo de personas */}
              <Route path="personas" element={<PersonasPage />} />
              <Route path="personas/:id" element={<PersonaDetallePage />} />

              {/* Módulo de activos */}
              <Route path="activos" element={<ActivosPage />} />
              {/*
                Las rutas de categoría se definen ANTES de activos/:id.
                React Router v6 prioriza segmentos estáticos sobre dinámicos,
                así que "activos/categoria/equipos" gana sobre "activos/:id".
              */}
              <Route path="activos/categoria/:categoria" element={<CategoriaActivosPage />} />
              <Route path="activos/:id" element={<ActivoDetallePage />} />

              {/* Archivo histórico — solo lectura */}
              <Route path="archivo" element={<ArchivoPage />} />

              {/* Módulo de configuración */}
              <Route path="configuracion/perfil"   element={<PerfilPage />} />
              <Route path="configuracion/usuarios" element={<UsuariosPage />} />

            </Route>
          </Route>

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
