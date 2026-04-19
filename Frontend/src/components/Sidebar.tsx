/**
 * Sidebar.tsx
 *
 * Barra de navegación lateral de la aplicación.
 * Muestra el nombre del sistema, los enlaces de navegación y el botón de logout.
 *
 * Estructura de navegación:
 *   Dashboard      → link directo a "/"
 *   Personas       → link directo a "/personas"
 *   Activos        → botón que expande/colapsa sub-items (no navega)
 *     ↳ Equipos    (sub-link con indent)
 *     ↳ Celulares
 *     ↳ Tablets
 *     ↳ Licencias
 *   Configuración  → botón que expande/colapsa sub-items (no navega)
 *     ↳ Mi perfil
 *     ↳ Usuarios
 *
 * "Activos" y "Configuración" no son links — solo abren/cierran sus secciones.
 * Sus sub-items son los NavLinks reales que llevan a las rutas correspondientes.
 *
 * Usa NavLink de React Router para detectar la ruta activa automáticamente
 * y aplicar estilos distintos al ítem seleccionado.
 */

import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── Items de navegación principal ─────────────────────────────────────────────

/**
 * Los ítems de primer nivel que son links directos (Dashboard, Personas, Archivo).
 * Los ítems con sub-items (Activos, Configuración) se manejan por separado
 * como botones de toggle, no como NavLinks.
 */
const navDirectos = [
  { to: '/',         etiqueta: 'Dashboard', icono: '▦', end: true  },
  { to: '/personas', etiqueta: 'Personas',  icono: '◉', end: false },
  // Archivo: página de solo lectura para registros desactivados/dados de baja
  { to: '/archivo',  etiqueta: 'Archivo',   icono: '⊡', end: false },
]

/**
 * Sub-links bajo el toggle "Activos".
 * El primero ("Todos") va a /activos (la tabla general con filtros).
 * Los siguientes van a las sub-páginas por categoría con tablas específicas.
 */
const navCategorias = [
  { to: '/activos',                     etiqueta: 'Todos',     end: true  },
  { to: '/activos/categoria/equipos',   etiqueta: 'Equipos',   end: false },
  { to: '/activos/categoria/celulares', etiqueta: 'Celulares', end: false },
  { to: '/activos/categoria/tablets',   etiqueta: 'Tablets',   end: false },
  { to: '/activos/categoria/licencias', etiqueta: 'Licencias', end: false },
]

/**
 * Sub-links de configuración.
 * Se muestran u ocultan según el estado configAbierto.
 */
const navConfiguracion = [
  { to: '/configuracion/perfil',   etiqueta: 'Mi perfil' },
  { to: '/configuracion/usuarios', etiqueta: 'Usuarios'  },
]

// ── Helpers de estilo ─────────────────────────────────────────────────────────

/**
 * Clases CSS para un NavLink de primer nivel según si está activo o no.
 */
function claseNavLink({ isActive }: { isActive: boolean }): string {
  const base = 'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left'
  if (isActive) return `${base} bg-blue-600 text-white`
  return `${base} text-slate-400 hover:text-white hover:bg-slate-700`
}

/**
 * Clases CSS para los botones de sección (Activos, Configuración).
 * Son visualmente iguales a los NavLinks de primer nivel pero nunca se "activan",
 * porque no son links sino botones de toggle.
 */
function claseBotonSeccion(): string {
  return 'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left text-slate-400 hover:text-white hover:bg-slate-700'
}

/**
 * Clases CSS para los sub-links de categoría y configuración.
 * Más pequeños y con indent a la izquierda.
 */
function claseSubLink({ isActive }: { isActive: boolean }): string {
  const base = 'flex items-center gap-2 pl-10 pr-4 py-2 rounded-lg text-xs font-medium transition-colors'
  if (isActive) return `${base} text-white bg-slate-700`
  return `${base} text-slate-500 hover:text-slate-200 hover:bg-slate-800`
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * Barra lateral con logo, navegación principal, sub-links colapsables y botón de logout.
 */
export default function Sidebar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  /**
   * Estado de las secciones colapsables.
   * Activos empieza abierto (es la sección más usada).
   * Configuración empieza cerrado.
   */
  const [activosAbierto, setActivosAbierto] = useState(true)
  const [configAbierto,  setConfigAbierto]  = useState(false)

  /**
   * Cierra la sesión y redirige al login.
   */
  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-900 flex flex-col min-h-screen">

      {/* ── Logo / título del sistema ─────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Gestión TI
        </p>
        <p className="text-lg font-bold text-white leading-tight mt-0.5">
          Inventario
        </p>
      </div>

      {/* ── Navegación principal ──────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">

        {/* Dashboard y Personas — links directos */}
        {navDirectos.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={claseNavLink}
          >
            <span className="text-base leading-none">{item.icono}</span>
            <span>{item.etiqueta}</span>
          </NavLink>
        ))}

        {/* ── Sección Activos ──────────────────────────────────────────────
             Botón que expande/colapsa los sub-links. No navega a ninguna ruta.
             La flecha (▸/▾) indica el estado abierto/cerrado. */}
        <button
          type="button"
          onClick={() => setActivosAbierto(prev => !prev)}
          className={claseBotonSeccion()}
        >
          <span className="text-base leading-none">▣</span>
          <span className="flex-1">Activos</span>
          {/* Flecha indicadora del estado del panel */}
          <span className="text-xs text-slate-600">
            {activosAbierto ? '▾' : '▸'}
          </span>
        </button>

        {/* Sub-links de activos — visibles solo cuando activosAbierto=true.
             "Todos" usa end=true para no activarse cuando estamos en /activos/categoria/*.
             Los links de categoría usan end=false (aunque con rutas exactas no importa). */}
        {activosAbierto && (
          <div className="flex flex-col gap-0.5 mt-0.5">
            {navCategorias.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={claseSubLink}
              >
                <span className="text-slate-600">–</span>
                <span>{item.etiqueta}</span>
              </NavLink>
            ))}
          </div>
        )}

        {/* ── Sección Configuración ────────────────────────────────────────
             Botón que expande/colapsa los sub-links. No navega a ninguna ruta. */}
        <button
          type="button"
          onClick={() => setConfigAbierto(prev => !prev)}
          className={claseBotonSeccion()}
        >
          <span className="text-base leading-none">⚙</span>
          <span className="flex-1">Configuración</span>
          <span className="text-xs text-slate-600">
            {configAbierto ? '▾' : '▸'}
          </span>
        </button>

        {/* Sub-links de configuración — visibles solo cuando configAbierto=true */}
        {configAbierto && (
          <div className="flex flex-col gap-0.5 mt-0.5">
            {navConfiguracion.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={claseSubLink}
              >
                <span className="text-slate-600">–</span>
                <span>{item.etiqueta}</span>
              </NavLink>
            ))}
          </div>
        )}

      </nav>

      {/* ── Footer: email del usuario + logout ───────────────────────────── */}
      <div className="px-4 py-4 border-t border-slate-700 flex flex-col gap-3">

        {/* Email del usuario autenticado — truncado si es muy largo */}
        {usuario && (
          <p className="text-xs text-slate-400 truncate px-2" title={usuario.email}>
            {usuario.email}
          </p>
        )}

        {/* Botón de cerrar sesión */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
                     text-slate-400 hover:text-white hover:bg-slate-700
                     transition-colors w-full text-left"
        >
          <span className="text-base leading-none">⎋</span>
          <span>Cerrar sesión</span>
        </button>

      </div>

    </aside>
  )
}
