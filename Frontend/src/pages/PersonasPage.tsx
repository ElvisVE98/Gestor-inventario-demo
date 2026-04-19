/**
 * PersonasPage.tsx
 *
 * Página de listado de personas.
 * Carga todas las personas (activas e inactivas) al montar para tener
 * los valores completos de los filtros de sucursal y centro_costo.
 * El filtrado se hace 100% en cliente para respuesta instantánea.
 *
 * Nuevas funcionalidades respecto a la versión anterior:
 *   - Columna "Centro costo" en la tabla
 *   - Filtros por sucursal y por centro_costo (dropdowns con valores únicos)
 *   - Toggle "Ver inactivos" que muestra/oculta personas desactivadas
 */

import { useEffect, useState, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { getPersonasTodas, desactivarPersona, getPersonaById } from '../services/persona.service'
import type { Persona, ActivoAsignado } from '../types/persona.types'
import ModalCrearPersona  from '../components/ModalCrearPersona'
import ModalEditarPersona from '../components/ModalEditarPersona'
import ModalConfirmar     from '../components/ModalConfirmar'
import { exportarCsv }   from '../utils/exportarCsv'

/**
 * Badge de estado para una persona.
 * Verde para activo, gris para inactivo.
 */
function BadgeEstado({ estado }: { estado: string }) {
  if (estado === 'activo') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        bg-emerald-100 text-emerald-700">
        Activo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      bg-slate-100 text-slate-500">
      Inactivo
    </span>
  )
}

// ── Chip de resumen de activos por categoría ─────────────────────────────────

/**
 * Muestra el ícono de una categoría + la cantidad de activos asignados.
 * Si count=0 muestra "—" en gris para indicar que no hay ninguno.
 */
function ChipCategoria({ icono, label, count }: { icono: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm leading-none">{icono}</span>
      <span className="text-xs text-slate-500">{label}</span>
      {count > 0 ? (
        // Badge con cantidad — fondo azul claro para destacar
        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      ) : (
        // Sin activos en esta categoría
        <span className="text-xs text-slate-300 font-medium">—</span>
      )}
    </div>
  )
}

// ── Componente de filtro select reutilizable ──────────────────────────────────

/**
 * Select genérico para los filtros de la barra superior.
 */
function FiltroSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 text-sm border border-slate-300 rounded-lg
                 text-slate-700 bg-white
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      {children}
    </select>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PersonasPage() {
  // Lista completa desde la API (activas + inactivas)
  const [personas, setPersonas]   = useState<Persona[]>([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [busqueda,         setBusqueda]         = useState('')
  const [filtroSucursal,   setFiltroSucursal]   = useState('')
  const [filtroCentroCosto, setFiltroCentroCosto] = useState('')
  // Toggle: por defecto muestra solo activas, igual que antes
  const [verInactivos,     setVerInactivos]     = useState(false)

  // ── Accordion de activos ─────────────────────────────────────────────────
  // ID de la persona expandida; null = ninguna (accordion cerrado)
  const [filaExpandida,  setFilaExpandida]  = useState<string | null>(null)
  // Cache de activos por persona — se llena con lazy loading al expandir
  // undefined = no cargado aún; [] = cargado pero sin activos
  const [cachActivos,    setCachActivos]    = useState<Record<string, ActivoAsignado[]>>({})
  // Indica qué filas están cargando sus activos en este momento
  const [cargandoFila,   setCargandoFila]   = useState<Record<string, boolean>>({})

  // ── Modales ───────────────────────────────────────────────────────────────
  const [modalCrearAbierto,          setModalCrearAbierto]          = useState(false)
  const [personaParaEditar,          setPersonaParaEditar]          = useState<Persona | null>(null)
  const [personaParaDesactivar,      setPersonaParaDesactivar]      = useState<Persona | null>(null)

  // Cargamos TODAS las personas (incluyendo inactivas) una sola vez.
  // Así los dropdowns de sucursal y centro_costo tienen todos los valores posibles.
  useEffect(() => {
    getPersonasTodas()
      .then(setPersonas)
      .catch((err: Error) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  // ── Valores únicos para los dropdowns de filtro ───────────────────────────
  // Derivamos directamente de la lista cargada para que reflejen los datos reales.
  const sucursales   = [...new Set(personas.map(p => p.sucursal).filter(Boolean))].sort()
  const centrosCosto = [...new Set(personas.map(p => p.centro_costo).filter(Boolean))].sort()

  // ── Filtrado en cliente ───────────────────────────────────────────────────
  const busquedaNorm = busqueda.toLowerCase().trim()

  const personasFiltradas = personas.filter(p => {
    // Ocultar inactivas si el toggle está desactivado
    if (!verInactivos && p.estado !== 'activo') return false

    // Filtro por sucursal exacta
    if (filtroSucursal && p.sucursal !== filtroSucursal) return false

    // Filtro por centro de costo exacto
    if (filtroCentroCosto && p.centro_costo !== filtroCentroCosto) return false

    // Búsqueda de texto por nombre o RUT
    if (busquedaNorm) {
      const coincide =
        p.nombre.toLowerCase().includes(busquedaNorm) ||
        p.rut.toLowerCase().includes(busquedaNorm)
      if (!coincide) return false
    }

    return true
  })

  // Contadores para el subtítulo del encabezado
  const totalActivas   = personas.filter(p => p.estado === 'activo').length
  const totalInactivas = personas.filter(p => p.estado !== 'activo').length

  // ── Handler del accordion ────────────────────────────────────────────────

  /**
   * Abre o cierra el panel de activos de una persona.
   * Si la fila ya está abierta → la cierra.
   * Si está cerrada → la abre y carga los activos con lazy loading.
   * Solo se llama a la API la primera vez; las visitas siguientes usan el cache.
   */
  async function toggleFila(personaId: string) {
    // Clic en la misma fila → colapsar
    if (filaExpandida === personaId) {
      setFilaExpandida(null)
      return
    }

    // Expandir esta fila
    setFilaExpandida(personaId)

    // Los datos ya están en cache — no volver a pedir
    if (cachActivos[personaId] !== undefined) return

    // Primera vez: marcar como cargando, obtener datos y guardar en cache
    setCargandoFila(prev => ({ ...prev, [personaId]: true }))
    try {
      const detalle = await getPersonaById(personaId)
      setCachActivos(prev => ({ ...prev, [personaId]: detalle.activos_asignados }))
    } catch {
      // Si falla, guardamos array vacío para no reintentar indefinidamente
      setCachActivos(prev => ({ ...prev, [personaId]: [] }))
    } finally {
      setCargandoFila(prev => ({ ...prev, [personaId]: false }))
    }
  }

  // ── Handler de exportación ────────────────────────────────────────────────

  /**
   * Exporta las personas actualmente visibles (respetando todos los filtros activos)
   * como archivo CSV. Solo incluye las columnas relevantes — no IDs internos.
   */
  function handleExportarCsv() {
    const filas = personasFiltradas.map(p => ({
      nombre:       p.nombre,
      rut:          p.rut,
      cargo:        p.cargo,
      sucursal:     p.sucursal,
      centro_costo: p.centro_costo,
      estado:       p.estado,
    }))
    exportarCsv('personas', filas)
  }

  // ── Handlers de modales ───────────────────────────────────────────────────

  /**
   * Agrega la persona creada al inicio de la lista y cierra el modal.
   */
  function handleCreada(nueva: Persona) {
    setPersonas(prev => [nueva, ...prev])
    setModalCrearAbierto(false)
  }

  /**
   * Reemplaza en la lista la persona con los datos actualizados.
   */
  function handleEditada(actualizada: Persona) {
    setPersonas(prev => prev.map(p => p.id === actualizada.id ? actualizada : p))
    setPersonaParaEditar(null)
  }

  /**
   * Llama al backend para desactivar y actualiza el estado local.
   * En vez de quitar la persona de la lista, actualizamos su estado a 'inactivo'
   * para que siga apareciendo cuando el toggle "Ver inactivos" esté activo.
   */
  async function handleDesactivar() {
    if (!personaParaDesactivar) return
    await desactivarPersona(personaParaDesactivar.id)
    setPersonas(prev =>
      prev.map(p =>
        p.id === personaParaDesactivar.id ? { ...p, estado: 'inactivo' as const } : p
      )
    )
    setPersonaParaDesactivar(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm animate-pulse">Cargando personas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">No se pudo cargar la lista</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  // Determinamos si hay algún filtro activo para mostrar el contador de resultados
  const hayFiltros = !!(busqueda || filtroSucursal || filtroCentroCosto || verInactivos)

  return (
    <div className="p-8 max-w-full">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Personas</h1>
          <p className="text-slate-500 text-sm mt-1">
            {totalActivas} activa{totalActivas !== 1 ? 's' : ''}
            {totalInactivas > 0 && (
              <span className="text-slate-400"> · {totalInactivas} inactiva{totalInactivas !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Exportar solo se habilita cuando hay resultados visibles */}
          <button
            onClick={handleExportarCsv}
            disabled={personasFiltradas.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300
                       hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↓ Exportar CSV
          </button>
          <button
            onClick={() => setModalCrearAbierto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                       text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span>+</span>
            Nueva persona
          </button>
        </div>
      </div>

      {/* ── Barra de filtros ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">

        {/* Búsqueda por nombre o RUT */}
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o RUT..."
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg
                     placeholder:text-slate-400 text-slate-800
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     w-52"
        />

        {/* Filtro por sucursal — valores derivados de los datos cargados */}
        <FiltroSelect value={filtroSucursal} onChange={setFiltroSucursal}>
          <option value="">Todas las sucursales</option>
          {sucursales.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </FiltroSelect>

        {/* Filtro por centro de costo — valores derivados de los datos cargados */}
        <FiltroSelect value={filtroCentroCosto} onChange={setFiltroCentroCosto}>
          <option value="">Todos los centros de costo</option>
          {centrosCosto.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FiltroSelect>

        {/* Toggle para mostrar personas inactivas */}
        <button
          onClick={() => setVerInactivos(prev => !prev)}
          className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            verInactivos
              ? 'bg-slate-800 text-white border-slate-800'    // activo → oscuro
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'  // inactivo → normal
          }`}
        >
          {verInactivos ? '● Ver inactivos' : '○ Ver inactivos'}
        </button>

        {/* Contador de resultados — solo visible si hay algún filtro activo */}
        {hayFiltros && (
          <span className="text-xs text-slate-400 self-center">
            {personasFiltradas.length} resultado{personasFiltradas.length !== 1 ? 's' : ''}
          </span>
        )}

      </div>

      {/* ── Tabla ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">RUT</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cargo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sucursal</th>
              {/* Nueva columna: centro de costo */}
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Centro costo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {personasFiltradas.length === 0 ? (
              // Estado vacío
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                  {hayFiltros
                    ? 'No se encontraron personas con los filtros seleccionados'
                    : 'No hay personas registradas'}
                </td>
              </tr>
            ) : (
              personasFiltradas.map(persona => {
                const expandida = filaExpandida === persona.id
                const activos   = cachActivos[persona.id] ?? []
                const cargando  = cargandoFila[persona.id] ?? false

                // Conteo por categoría para los chips
                const nEquipos   = activos.filter(a => a.categoria === 'equipo').length
                const nCelulares = activos.filter(a => a.categoria === 'celular').length
                const nTablets   = activos.filter(a => a.categoria === 'tablet').length
                const nLicencias = activos.filter(a => a.categoria === 'licencia').length

                return (
                  // Fragment para emitir la fila principal + la fila del accordion
                  // sin envolver en un <div> que rompería la estructura de la tabla
                  <Fragment key={persona.id}>

                    {/* ── Fila principal ──────────────────────────────────── */}
                    <tr
                      className={`transition-colors ${
                        expandida
                          ? 'bg-blue-50/40'         // resaltada cuando está expandida
                          : 'hover:bg-slate-50'
                      } ${
                        persona.estado !== 'activo' ? 'opacity-60' : ''
                      }`}
                    >

                      {/* Nombre — clic abre/cierra el accordion */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleFila(persona.id)}
                          className="flex items-center gap-1.5 font-medium text-slate-800
                                     hover:text-blue-600 transition-colors text-left"
                        >
                          {/* Flecha indicadora — rota 90° cuando está expandida */}
                          <span className={`text-xs text-slate-400 transition-transform duration-200 ${
                            expandida ? 'rotate-90' : ''
                          }`}>
                            ▸
                          </span>
                          {persona.nombre}
                        </button>
                      </td>

                      {/* RUT */}
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {persona.rut}
                      </td>

                      {/* Cargo */}
                      <td className="px-4 py-3 text-slate-600">{persona.cargo}</td>

                      {/* Sucursal */}
                      <td className="px-4 py-3 text-slate-600">{persona.sucursal}</td>

                      {/* Centro de costo */}
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {persona.centro_costo || '—'}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <BadgeEstado estado={persona.estado} />
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">

                          <Link
                            to={`/personas/${persona.id}`}
                            className="px-3 py-1 text-xs font-medium text-blue-600
                                       hover:text-blue-800 hover:bg-blue-50
                                       rounded-md transition-colors"
                          >
                            Ver
                          </Link>

                          <button
                            onClick={() => setPersonaParaEditar(persona)}
                            className="px-3 py-1 text-xs font-medium text-slate-600
                                       hover:text-slate-800 hover:bg-slate-100
                                       rounded-md transition-colors"
                          >
                            Editar
                          </button>

                          {persona.estado === 'activo' && (
                            <button
                              onClick={() => setPersonaParaDesactivar(persona)}
                              className="px-3 py-1 text-xs font-medium text-red-500
                                         hover:text-red-700 hover:bg-red-50
                                         rounded-md transition-colors"
                            >
                              Desactivar
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>

                    {/* ── Fila accordion — visible solo cuando expandida=true ── */}
                    {expandida && (
                      <tr className="bg-blue-50/30">
                        {/* Borde izquierdo azul como indicador visual de expansión */}
                        <td
                          colSpan={7}
                          className="px-6 py-3 border-l-4 border-l-blue-300"
                        >
                          {cargando ? (
                            // Estado de carga mientras llega la respuesta de la API
                            <p className="text-xs text-slate-400 animate-pulse">
                              Cargando activos...
                            </p>
                          ) : activos.length === 0 && cachActivos[persona.id] !== undefined ? (
                            // La API respondió pero no tiene activos asignados
                            <p className="text-xs text-slate-400">
                              Sin activos asignados actualmente
                            </p>
                          ) : (
                            // Chips por categoría
                            <div className="flex items-center gap-6 flex-wrap">
                              <span className="text-xs font-medium text-slate-500 mr-1">
                                Activos asignados:
                              </span>
                              <ChipCategoria icono="💻" label="Equipos"   count={nEquipos} />
                              <ChipCategoria icono="📱" label="Celulares" count={nCelulares} />
                              <ChipCategoria icono="📋" label="Tablets"   count={nTablets} />
                              <ChipCategoria icono="🔑" label="Licencias" count={nLicencias} />
                            </div>
                          )}
                        </td>
                      </tr>
                    )}

                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modales ─────────────────────────────────────────────────────── */}

      {modalCrearAbierto && (
        <ModalCrearPersona
          onClose={() => setModalCrearAbierto(false)}
          onCreada={handleCreada}
        />
      )}

      {personaParaEditar && (
        <ModalEditarPersona
          persona={personaParaEditar}
          onClose={() => setPersonaParaEditar(null)}
          onEditada={handleEditada}
        />
      )}

      {personaParaDesactivar && (
        <ModalConfirmar
          titulo="Desactivar persona"
          mensaje={`¿Estás seguro de que quieres desactivar a ${personaParaDesactivar.nombre}? Se liberarán todos sus activos asignados.`}
          labelConfirmar="Desactivar"
          onConfirmar={handleDesactivar}
          onCancelar={() => setPersonaParaDesactivar(null)}
        />
      )}

    </div>
  )
}
