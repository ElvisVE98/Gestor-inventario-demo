/**
 * DashboardPage.tsx
 *
 * Pantalla principal del sistema. Layout con 4 secciones:
 *   1. Header con fecha actual y subtítulo
 *   2. Fila de 4 KPI cards (activos por estado)
 *   3. Gráfico de dona (categorías) + barras de estado lado a lado
 *   4. Fila de 3 cards de resumen (personas, asignaciones, bajas)
 *
 * Hace una sola llamada a la API al montar y maneja carga/error antes del render.
 */

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts'
import type { DashboardKPIs } from '../types/dashboard.types'
import { obtenerDashboard } from '../services/dashboard.service'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Devuelve la fecha de hoy formateada en español.
 * Ej: "Jueves, 16 de abril de 2026"
 */
function fechaHoy(): string {
  const str = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  // toLocaleDateString devuelve minúsculas en es-CL; capitalizamos la primera letra
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Formatea un número como moneda CLP sin decimales.
 * Ej: 4500000 → "$4.500.000"
 */
function formatCLP(valor: number): string {
  return new Intl.NumberFormat('es-CL', {
    style:                 'currency',
    currency:              'CLP',
    maximumFractionDigits: 0,
  }).format(valor)
}

// ── Íconos SVG inline ─────────────────────────────────────────────────────────
// Cada ícono recibe una clase Tailwind para tamaño y color desde el padre.

/** Monitor — total de activos */
function IcoMonitor({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

/** Check — activos disponibles */
function IcoCheck({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

/** Person — activos asignados */
function IcoPersona({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

/** Wrench — activos en mantenimiento */
function IcoHerramienta({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

/** Users — personas activas */
function IcoGrupo({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

/** Link — asignaciones activas */
function IcoLink({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

/** Archive — activos dados de baja */
function IcoArchivo({ cls }: { cls: string }) {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

interface KpiTopProps {
  titulo: string
  valor: number
  icono: React.ReactNode
  bgIcono: string    // clase Tailwind del fondo del contenedor del ícono
  colorValor: string // clase Tailwind del color del número
}

/**
 * KPI card: número grande + label + ícono decorativo en esquina superior derecha.
 * Diseño: fondo blanco, borde suave, sombra leve.
 */
function KpiTop({ titulo, valor, icono, bgIcono, colorValor }: KpiTopProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        {/* Número y etiqueta */}
        <div>
          <p className="text-sm text-slate-500">{titulo}</p>
          <p className={`text-3xl font-bold mt-1 ${colorValor}`}>{valor}</p>
        </div>
        {/* Ícono en contenedor con fondo de color */}
        <div className={`p-3 rounded-xl ${bgIcono} shrink-0`}>
          {icono}
        </div>
      </div>
    </div>
  )
}

interface BarraProps {
  label: string
  valor: number
  total: number
  colorBarra: string  // clase Tailwind del color de la barra rellena
  colorPunto: string  // clase Tailwind del color del indicador circular
}

/**
 * Fila de estado: punto de color + nombre + conteo + porcentaje + barra de progreso.
 * El width de la barra es dinámico (runtime), no se puede expresar como clase Tailwind fija.
 */
function BarraEstado({ label, valor, total, colorBarra, colorPunto }: BarraProps) {
  // Porcentaje proporcional; evitamos división por cero
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorPunto}`} />
          <span className="text-sm text-slate-600">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{valor}</span>
          <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
        </div>
      </div>
      {/* Pista gris + barra rellena con ancho dinámico */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorBarra}`}
          style={{ width: `${pct}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
}

/**
 * Tooltip personalizado para el gráfico de dona.
 * Recharts lo invoca pasando active y payload como props.
 */
function TooltipDonut({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-sm font-medium text-slate-800">{payload[0].name}</p>
      <p className="text-sm text-slate-500">{payload[0].value} activos</p>
    </div>
  )
}

/**
 * Tooltip para el gráfico de barras de costo.
 * Muestra el monto formateado como CLP para que sea legible (no el número crudo).
 */
function TooltipCLP({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-sm font-semibold text-slate-800">{formatCLP(payload[0].value)}</p>
    </div>
  )
}

/**
 * Tooltip para los gráficos de conteo de activos.
 * Muestra el nombre de la categoría (label) y la cantidad de activos.
 */
function TooltipCantidad({ active, payload, label }: {
  active?:  boolean
  payload?: Array<{ value: number }>
  label?:   string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
      {label && <p className="text-xs text-slate-500 mb-0.5">{label}</p>}
      <p className="text-sm font-semibold text-slate-800">{payload[0].value} activos</p>
    </div>
  )
}

// ── Datos del gráfico de dona ─────────────────────────────────────────────────

/**
 * Mapa de categorías → color hex para el gráfico de dona y la leyenda.
 * Los colores son constantes de diseño, no vienen de la API.
 * Se usan hex directos porque Tailwind purga clases dinámicas en build.
 */
const CATEGORIAS: Array<{ key: keyof DashboardKPIs; nombre: string; color: string }> = [
  { key: 'total_equipos',   nombre: 'Equipos',   color: '#3b82f6' }, // blue-500
  { key: 'total_celulares', nombre: 'Celulares', color: '#6366f1' }, // indigo-500
  { key: 'total_tablets',   nombre: 'Tablets',   color: '#8b5cf6' }, // violet-500
  { key: 'total_licencias', nombre: 'Licencias', color: '#06b6d4' }, // cyan-500
]

/**
 * Paleta de 10 colores para el gráfico de dona de centros de costo.
 * Se asignan en orden según el índice de cada segmento.
 * Se usan hex directos — Tailwind purga clases con colores dinámicos en build.
 */
const COLORES_CENTROS = [
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
]

// ── Componente principal ──────────────────────────────────────────────────────

export default function DashboardPage() {
  // null mientras la petición no ha terminado
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  // Spinner mientras llega la respuesta
  const [cargando, setCargando] = useState(true)
  // Mensaje de error si la API falla
  const [error, setError] = useState<string | null>(null)

  // El array vacío [] hace que solo se ejecute al montar el componente
  useEffect(() => {
    obtenerDashboard()
      .then(datos => setKpis(datos))
      .catch((err: Error) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  // ── Estado de carga ────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm animate-pulse">Cargando datos...</p>
      </div>
    )
  }

  // ── Estado de error ────────────────────────────────────────────────────────
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

  // Construimos el array de datos para Recharts a partir de los KPIs recibidos
  const datosCat = CATEGORIAS.map(c => ({
    nombre: c.nombre,
    valor:  kpis[c.key] as number,
    color:  c.color,
  }))

  // Datos para los 3 nuevos gráficos — ya vienen ordenados del backend (mayor → menor)
  // Filtramos costo > 0 y limitamos a TOP 10 para que los gráficos no sean demasiado largos
  const datosCosto   = kpis.costo_por_sucursal.filter(d => d.costo_total > 0).slice(0, 10)
  const datosActivos = kpis.activos_por_sucursal.slice(0, 10)

  // datosCentros: agregamos un color por índice para cada segmento de la dona
  const datosCentros = kpis.top_centros_costo.map((d, i) => ({
    ...d,
    color: COLORES_CENTROS[i % COLORES_CENTROS.length],
  }))

  // ── Dashboard con datos ────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-full space-y-6">

      {/* ── SECCIÓN 1: Header ────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-slate-400">{fechaHoy()}</p>
        <h1 className="text-2xl font-bold text-slate-800 mt-0.5">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Resumen general del inventario TI</p>
      </div>

      {/* ── SECCIÓN 2: KPI Cards superiores — activos por estado ─────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTop
          titulo="Total activos"
          valor={kpis.total_activos}
          bgIcono="bg-blue-50"
          colorValor="text-blue-700"
          icono={<IcoMonitor cls="w-5 h-5 text-blue-600" />}
        />
        <KpiTop
          titulo="Disponibles"
          valor={kpis.activos_disponibles}
          bgIcono="bg-emerald-50"
          colorValor="text-emerald-700"
          icono={<IcoCheck cls="w-5 h-5 text-emerald-600" />}
        />
        <KpiTop
          titulo="Asignados"
          valor={kpis.activos_asignados}
          bgIcono="bg-indigo-50"
          colorValor="text-indigo-700"
          icono={<IcoPersona cls="w-5 h-5 text-indigo-600" />}
        />
        <KpiTop
          titulo="En mantenimiento"
          valor={kpis.activos_en_mantenimiento}
          bgIcono="bg-amber-50"
          colorValor="text-amber-700"
          icono={<IcoHerramienta cls="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* ── SECCIÓN 3: Gráfico de dona + Barras de estado ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Columna izquierda — gráfico de dona por categoría */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Activos por categoría</h2>

          {/* ResponsiveContainer adapta el ancho al contenedor en tiempo de ejecución */}
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={datosCat}
                dataKey="valor"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                innerRadius={55}  // hueco interior que da el efecto de dona
                outerRadius={85}
                paddingAngle={3}
                strokeWidth={0}
              >
                {/* Cada segmento recibe el color de su categoría */}
                {datosCat.map(cat => (
                  <Cell key={cat.nombre} fill={cat.color} />
                ))}
              </Pie>
              <Tooltip content={<TooltipDonut />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Leyenda manual: punto hex + nombre + cantidad */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
            {datosCat.map(cat => (
              <div key={cat.nombre} className="flex items-center gap-2">
                {/* backgroundColor viene de datos — no es una clase Tailwind fija */}
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs text-slate-600 truncate">{cat.nombre}</span>
                <span className="text-xs font-semibold text-slate-800 ml-auto">{cat.valor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha — barras de progreso por estado */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-5">Estado del inventario</h2>
          <div className="flex flex-col gap-5">
            <BarraEstado
              label="Disponibles"
              valor={kpis.activos_disponibles}
              total={kpis.total_activos}
              colorBarra="bg-emerald-500"
              colorPunto="bg-emerald-500"
            />
            <BarraEstado
              label="Asignados"
              valor={kpis.activos_asignados}
              total={kpis.total_activos}
              colorBarra="bg-indigo-500"
              colorPunto="bg-indigo-500"
            />
            <BarraEstado
              label="En mantenimiento"
              valor={kpis.activos_en_mantenimiento}
              total={kpis.total_activos}
              colorBarra="bg-amber-500"
              colorPunto="bg-amber-500"
            />
            <BarraEstado
              label="Dados de baja"
              valor={kpis.activos_dados_de_baja}
              total={kpis.total_activos}
              colorBarra="bg-rose-400"
              colorPunto="bg-rose-400"
            />
          </div>
        </div>

      </div>

      {/* ── SECCIÓN 4: Fila de 3 cards de resumen ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTop
          titulo="Personas activas"
          valor={kpis.personas_activas}
          bgIcono="bg-teal-50"
          colorValor="text-teal-700"
          icono={<IcoGrupo cls="w-5 h-5 text-teal-600" />}
        />
        <KpiTop
          titulo="Asignaciones activas"
          valor={kpis.asignaciones_activas}
          bgIcono="bg-sky-50"
          colorValor="text-sky-700"
          icono={<IcoLink cls="w-5 h-5 text-sky-600" />}
        />
        <KpiTop
          titulo="Dados de baja"
          valor={kpis.activos_dados_de_baja}
          bgIcono="bg-rose-50"
          colorValor="text-rose-700"
          icono={<IcoArchivo cls="w-5 h-5 text-rose-600" />}
        />
      </div>

      {/* ── SECCIÓN 5: Gráficos de distribución por sucursal y centro de costo ── */}

      {/* ── Gráfico 1: Costo por sucursal — ancho completo ──────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Costo por sucursal</h2>
        <p className="text-xs text-slate-400 mb-4">Top 10 · valor de activos asignados actualmente</p>

        {datosCosto.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">Sin datos de costo disponibles</p>
        ) : (
          // layout="vertical" convierte el BarChart en barras horizontales.
          // El margen derecho es amplio para que el LabelList (monto CLP) no se corte.
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={datosCosto}
              layout="vertical"
              margin={{ top: 4, right: 140, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              {/* YAxis tipo "category" muestra los nombres de sucursal */}
              <YAxis
                type="category"
                dataKey="sucursal"
                width={130}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              {/* XAxis oculto — el valor exacto ya aparece como label en la barra */}
              <XAxis type="number" hide />
              <Tooltip content={<TooltipCLP />} cursor={{ fill: '#eff6ff' }} />
              <Bar dataKey="costo_total" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={30}>
                {/* LabelList pinta el monto formateado al final de cada barra */}
                <LabelList
                  dataKey="costo_total"
                  position="right"
                  formatter={(v) => formatCLP(Number(v ?? 0))}
                  style={{ fontSize: 11, fill: '#475569', fontVariantNumeric: 'tabular-nums' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Gráficos 2 y 3: lado a lado ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfico 2: Top centros de costo — dona con leyenda ────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Top 10 centros de costo</h2>
          <p className="text-xs text-slate-400 mb-4">Por cantidad de activos asignados actualmente</p>

          {datosCentros.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Sin datos disponibles</p>
          ) : (
            <>
              {/* Dona: innerRadius crea el hueco central, nameKey alimenta el tooltip */}
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={datosCentros}
                    dataKey="total"
                    nameKey="centro_costo"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {datosCentros.map(d => (
                      <Cell key={d.centro_costo} fill={d.color} />
                    ))}
                  </Pie>
                  {/* Reutilizamos TooltipDonut — muestra name + value + "activos" */}
                  <Tooltip content={<TooltipDonut />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Leyenda manual: punto de color + nombre + cantidad */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
                {datosCentros.map(d => (
                  <div key={d.centro_costo} className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-slate-600 truncate">{d.centro_costo}</span>
                    <span className="text-xs font-semibold text-slate-800 ml-auto shrink-0">{d.total}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Gráfico 3: Activos por sucursal — barras horizontales con label ──── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Activos por sucursal</h2>
          <p className="text-xs text-slate-400 mb-4">Top 10 · activos asignados actualmente</p>

          {datosActivos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Sin datos disponibles</p>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={datosActivos}
                layout="vertical"
                margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <YAxis
                  type="category"
                  dataKey="sucursal"
                  width={130}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                {/* XAxis oculto — el número exacto aparece como label en la barra */}
                <XAxis type="number" hide />
                <Tooltip content={<TooltipCantidad />} cursor={{ fill: '#f0fdfa' }} />
                <Bar dataKey="total" fill="#14b8a6" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {/* LabelList pinta el conteo al final de cada barra */}
                  <LabelList
                    dataKey="total"
                    position="right"
                    style={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

    </div>
  )
}
