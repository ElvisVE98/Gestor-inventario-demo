/**
 * Layout.tsx
 *
 * Shell visual de todas las páginas: sidebar fijo a la izquierda + área de contenido.
 * Usa <Outlet /> de React Router para renderizar la página activa en el área derecha.
 *
 * Todas las rutas están anidadas bajo este Layout en App.tsx,
 * así el sidebar siempre está visible sin importar qué página se esté viendo.
 */

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

/**
 * Envuelve todas las páginas con el sidebar y el área de contenido principal.
 */
export default function Layout() {
  return (
    // Contenedor flex en fila que ocupa toda la altura de la pantalla
    <div className="flex min-h-screen bg-slate-50">

      {/* Barra lateral de navegación — siempre visible */}
      <Sidebar />

      {/* Área de contenido principal — ocupa el espacio restante */}
      {/* overflow-y-auto: permite scroll en la página si el contenido es largo */}
      <main className="flex-1 overflow-y-auto">
        {/* Outlet renderiza el componente de la ruta activa (ej: DashboardPage) */}
        <Outlet />
      </main>

    </div>
  )
}
