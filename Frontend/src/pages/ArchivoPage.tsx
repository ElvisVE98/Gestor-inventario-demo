/**
 * ArchivoPage.tsx
 *
 * Página de solo lectura que muestra los registros históricos desactivados.
 * No tiene botones de acción (sin editar, sin reactivar) — es puramente consultiva.
 *
 * Dos tabs:
 *   'personas' → personas con estado = 'inactivo'
 *   'activos'  → activos con estado = 'dado_de_baja'
 *
 * Carga ambos datasets al montar y filtra en cliente por búsqueda de texto.
 * Cada tab tiene botón "Exportar CSV" que descarga los resultados visibles.
 */

import { useEffect, useState } from 'react'
import { getPersonasInactivas, getActivosDadosDeBaja } from '../api/archivo.api'
import type { Persona } from '../types/persona.types'
import type { Activo }  from '../types/activo.types'
import { exportarCsv }  from '../utils/exportarCsv'

/** Tab activo de la página */
type Tab = 'personas' | 'activos'

// ── Helpers de etiqueta ───────────────────────────────────────────────────────

/** Etiqueta legible de la categoría de un activo */
const ETIQ_CAT: Record<string, string> = {
  equipo:   'Equipo',
  celular:  'Celular',
  tablet:   'Tablet',
  licencia: 'Licencia',
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

/**
 * Badge "Inactivo" — gris. Para personas desactivadas.
 */
function BadgeInactivo() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      bg-slate-100 text-slate-500">
      Inactivo
    </span>
  )
}

/**
 * Badge "Dado de baja" — rojo suave. Para activos retirados.
 */
function BadgeBaja() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      bg-red-100 text-red-600">
      Dado de baja
    </span>
  )
}

/**
 * Encabezado de columna de tabla — texto pequeño, uppercase, gris.
 */
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {children}
    </th>
  )
}

/**
 * Celda de tabla estándar.
 */
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 text-sm text-slate-600 ${mono ? 'font-mono text-xs' : ''}`}>
      {children}
    </td>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ArchivoPage() {
  // Tab activo
  const [tab, setTab] = useState<Tab>('personas')

  // ── Datos ─────────────────────────────────────────────────────────────────
  const [personasInactivas, setPersonasInactivas] = useState<Persona[]>([])
  const [activosBaja,       setActivosBaja]       = useState<Activo[]>([])

  // Estados de carga individuales para mostrar spinners correctamente
  const [cargandoPersonas, setCargandoPersonas] = useState(true)
  const [cargandoActivos,  setCargandoActivos]  = useState(true)

  // Errores independientes para que un fallo no oculte el otro tab
  const [errorPersonas, setErrorPersonas] = useState<string | null>(null)
  const [errorActivos,  setErrorActivos]  = useState<string | null>(null)

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  const [busqPersonas, setBusqPersonas] = useState('')
  const [busqActivos,  setBusqActivos]  = useState('')

  // Cargamos ambos datasets al montar — el archivo es solo lectura y raramente grande
  useEffect(() => {
    getPersonasInactivas()
      .then(setPersonasInactivas)
      .catch((err: Error) => setErrorPersonas(err.message))
      .finally(() => setCargandoPersonas(false))

    getActivosDadosDeBaja()
      .then(setActivosBaja)
      .catch((err: Error) => setErrorActivos(err.message))
      .finally(() => setCargandoActivos(false))
  }, [])

  // ── Filtrado en cliente ───────────────────────────────────────────────────

  /** Personas que coinciden con la búsqueda por nombre o RUT */
  const personasFiltradas = personasInactivas.filter(p => {
    if (!busqPersonas) return true
    const norm = busqPersonas.toLowerCase()
    return p.nombre.toLowerCase().includes(norm) || p.rut.toLowerCase().includes(norm)
  })

  /** Activos que coinciden con la búsqueda por nombre */
  const activosFiltrados = activosBaja.filter(a => {
    if (!busqActivos) return true
    return a.nombre_equipo.toLowerCase().includes(busqActivos.toLowerCase())
  })

  // ── Handlers de exportación ───────────────────────────────────────────────

  /** Exporta las personas visibles del tab como CSV */
  function exportarPersonas() {
    const filas = personasFiltradas.map(p => ({
      nombre:       p.nombre,
      rut:          p.rut,
      cargo:        p.cargo,
      sucursal:     p.sucursal,
      centro_costo: p.centro_costo,
      estado:       p.estado,
    }))
    exportarCsv('archivo_personas_inactivas', filas)
  }

  /** Exporta los activos visibles del tab como CSV */
  function exportarActivos() {
    const filas = activosFiltrados.map(a => ({
      nombre_equipo: a.nombre_equipo,
      categoria:     a.categoria,
      estado:        a.estado,
      marca:         a.marca  ?? '',
      modelo:        a.modelo ?? '',
      procesador:    a.procesador    ?? '',
      ram:           a.ram           ?? '',
      disco:         a.disco         ?? '',
      imei:          a.imei          ?? '',
      fecha_entrega: a.fecha_entrega ?? '',
    }))
    exportarCsv('archivo_activos_baja', filas)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-full">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Archivo</h1>
        <p className="text-slate-500 text-sm mt-1">
          Registros históricos — personas desactivadas y activos dados de baja
        </p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">

        {/* Tab Personas inactivas */}
        <button
          type="button"
          onClick={() => setTab('personas')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
            tab === 'personas'
              ? 'text-blue-600 border-blue-600'           // tab activo
              : 'text-slate-500 border-transparent hover:text-slate-700'  // tab inactivo
          }`}
        >
          Personas inactivas
          {/* Contador de registros junto al nombre del tab */}
          {!cargandoPersonas && (
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
              tab === 'personas' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {personasInactivas.length}
            </span>
          )}
        </button>

        {/* Tab Activos dados de baja */}
        <button
          type="button"
          onClick={() => setTab('activos')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
            tab === 'activos'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          Activos dados de baja
          {!cargandoActivos && (
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
              tab === 'activos' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {activosBaja.length}
            </span>
          )}
        </button>

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB: PERSONAS INACTIVAS
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'personas' && (
        <div>

          {/* Barra de búsqueda + botón exportar */}
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              value={busqPersonas}
              onChange={e => setBusqPersonas(e.target.value)}
              placeholder="Buscar por nombre o RUT..."
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg w-64
                         placeholder:text-slate-400 text-slate-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={exportarPersonas}
              disabled={personasFiltradas.length === 0}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white
                         border border-slate-300 hover:bg-slate-50 rounded-lg
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↓ Exportar CSV
            </button>
          </div>

          {/* Error */}
          {errorPersonas && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-red-600">{errorPersonas}</p>
            </div>
          )}

          {/* Spinner */}
          {cargandoPersonas ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-400 text-sm animate-pulse">Cargando personas...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <Th>Nombre</Th>
                    <Th>RUT</Th>
                    <Th>Cargo</Th>
                    <Th>Sucursal</Th>
                    <Th>Centro costo</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                        {busqPersonas
                          ? 'No se encontraron personas con esa búsqueda'
                          : 'No hay personas inactivas registradas'}
                      </td>
                    </tr>
                  ) : (
                    personasFiltradas.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <Td>
                          <span className="font-medium text-slate-800">{p.nombre}</span>
                        </Td>
                        <Td mono>{p.rut}</Td>
                        <Td>{p.cargo}</Td>
                        <Td>{p.sucursal}</Td>
                        <Td mono>{p.centro_costo || '—'}</Td>
                        <td className="px-4 py-3">
                          <BadgeInactivo />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: ACTIVOS DADOS DE BAJA
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'activos' && (
        <div>

          {/* Barra de búsqueda + botón exportar */}
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              value={busqActivos}
              onChange={e => setBusqActivos(e.target.value)}
              placeholder="Buscar por nombre del equipo..."
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg w-64
                         placeholder:text-slate-400 text-slate-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={exportarActivos}
              disabled={activosFiltrados.length === 0}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white
                         border border-slate-300 hover:bg-slate-50 rounded-lg
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↓ Exportar CSV
            </button>
          </div>

          {/* Error */}
          {errorActivos && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-red-600">{errorActivos}</p>
            </div>
          )}

          {/* Spinner */}
          {cargandoActivos ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-400 text-sm animate-pulse">Cargando activos...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <Th>Nombre</Th>
                    <Th>Categoría</Th>
                    <Th>Estado</Th>
                    <Th>Marca / Modelo</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">
                        {busqActivos
                          ? 'No se encontraron activos con esa búsqueda'
                          : 'No hay activos dados de baja registrados'}
                      </td>
                    </tr>
                  ) : (
                    activosFiltrados.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800">{a.nombre_equipo}</span>
                        </td>
                        <Td>{ETIQ_CAT[a.categoria] ?? a.categoria}</Td>
                        <td className="px-4 py-3">
                          <BadgeBaja />
                        </td>
                        <Td>
                          {[a.marca, a.modelo].filter(Boolean).join(' · ') || '—'}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
