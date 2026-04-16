/**
 * DashboardPage.tsx
 *
 * Pantalla principal del sistema. Muestra los KPIs más importantes de un vistazo:
 *   - Estado del inventario de activos (total, por estado, por categoría)
 *   - Personas activas en la empresa
 *   - Asignaciones activas
 *
 * Hace una sola llamada a la API al montar el componente y muestra
 * estados de carga y error antes de renderizar los datos.
 */

import { useEffect, useState } from 'react'
import type { DashboardKPIs } from '../types/dashboard.types'
import { obtenerDashboard } from '../services/dashboard.service'
import KpiCard from '../components/KpiCard'

/**
 * Página del dashboard con KPIs del sistema.
 */
export default function DashboardPage() {
  // Estado para los datos del dashboard (null mientras carga)
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)

  // Estado de carga para mostrar el spinner mientras llega la respuesta
  const [cargando, setCargando] = useState(true)

  // Estado de error para mostrar un mensaje si la API falla
  const [error, setError] = useState<string | null>(null)

  // Cargamos los datos al montar el componente.
  // El array vacío [] hace que este effect solo se ejecute una vez.
  useEffect(() => {
    obtenerDashboard()
      .then((datos) => {
        setKpis(datos)
      })
      .catch((err: Error) => {
        // Guardamos el mensaje de error para mostrarlo al usuario
        setError(err.message)
      })
      .finally(() => {
        // Siempre quitamos el spinner, haya éxito o error
        setCargando(false)
      })
  }, [])

  // ── Estado de carga ────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm animate-pulse">Cargando datos...</p>
      </div>
    )
  }

  // ── Estado de error ────────────────────────────────────────────────────
  if (error || !kpis) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">No se pudo cargar el dashboard</p>
          <p className="text-red-500 text-sm mt-1">{error ?? 'Error desconocido'}</p>
        </div>
      </div>
    )
  }

  // ── Dashboard con datos ────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-7xl">

      {/* Encabezado de la página */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Resumen general del inventario TI
        </p>
      </div>

      {/* ── Sección 1: Activos por estado ─────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Activos
        </h2>
        {/*
          5 tarjetas en fila en pantallas grandes.
          En pantallas pequeñas se apilan en 2 columnas.
        */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <KpiCard
            titulo="Total activos"
            valor={kpis.total_activos}
            variante="azul"
          />
          <KpiCard
            titulo="Disponibles"
            valor={kpis.activos_disponibles}
            variante="verde"
          />
          <KpiCard
            titulo="Asignados"
            valor={kpis.activos_asignados}
            variante="amarillo"
          />
          <KpiCard
            titulo="En mantenimiento"
            valor={kpis.activos_en_mantenimiento}
            variante="naranja"
          />
          <KpiCard
            titulo="Dados de baja"
            valor={kpis.activos_dados_de_baja}
            variante="rojo"
          />
        </div>
      </section>

      {/* ── Sección 2: Activos por categoría ──────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Por categoría
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            titulo="Equipos"
            valor={kpis.total_equipos}
            variante="violeta"
          />
          <KpiCard
            titulo="Celulares"
            valor={kpis.total_celulares}
            variante="morado"
          />
          <KpiCard
            titulo="Tablets"
            valor={kpis.total_tablets}
            variante="rosa"
          />
          <KpiCard
            titulo="Licencias"
            valor={kpis.total_licencias}
            variante="cyan"
          />
        </div>
      </section>

      {/* ── Sección 3: Personas y asignaciones ────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Personas y asignaciones
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            titulo="Personas activas"
            valor={kpis.personas_activas}
            variante="teal"
          />
          <KpiCard
            titulo="Asignaciones activas"
            valor={kpis.asignaciones_activas}
            variante="cielo"
          />
        </div>
      </section>

    </div>
  )
}
