/**
 * ActivosPage.tsx
 *
 * Listado completo de activos con:
 *   - Filtros por categoría y estado
 *   - Búsqueda por nombre de equipo
 *   - Toggle "Ver dados de baja" — recarga la lista incluyendo los retirados
 *   - Links rápidos a las sub-páginas de cada categoría
 *   - Acciones de editar / dar de baja / ver detalle
 *
 * Estado local tras cada acción CRUD — sin recargar desde la API.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActivos, getActivosConBaja, darDeBaja } from '../services/activo.service'
import type { Activo, CategoriaActivo, EstadoActivo } from '../types/activo.types'
import ModalCrearActivo  from '../components/ModalCrearActivo'
import ModalEditarActivo from '../components/ModalEditarActivo'
import ModalConfirmar    from '../components/ModalConfirmar'
import { exportarCsv }  from '../utils/exportarCsv'

// ── Badges ────────────────────────────────────────────────────────────────────

/**
 * Badge de categoría.
 * Colores fijos por categoría — clases literales para que Tailwind v4 las detecte.
 */
function BadgeCategoria({ categoria }: { categoria: string }) {
  const clases: Record<string, string> = {
    equipo:   'bg-violet-100 text-violet-700',
    celular:  'bg-blue-100 text-blue-700',
    tablet:   'bg-pink-100 text-pink-700',
    licencia: 'bg-cyan-100 text-cyan-700',
  }
  const etiquetas: Record<string, string> = {
    equipo:   'Equipo',
    celular:  'Celular',
    tablet:   'Tablet',
    licencia: 'Licencia',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[categoria] ?? 'bg-slate-100 text-slate-600'}`}>
      {etiquetas[categoria] ?? categoria}
    </span>
  )
}

/**
 * Badge de estado del activo.
 * Cada estado tiene su propio color para identificación visual rápida.
 *   disponible       → verde
 *   asignado         → amarillo
 *   en_mantenimiento → naranja
 *   prestamo         → índigo (asignación informal)
 *   dado_de_baja     → rojo claro
 *   robo             → rojo oscuro
 */
function BadgeEstado({ estado }: { estado: string }) {
  const clases: Record<string, string> = {
    disponible:        'bg-emerald-100 text-emerald-700',
    asignado:          'bg-amber-100 text-amber-700',
    en_mantenimiento:  'bg-orange-100 text-orange-700',
    prestamo:          'bg-indigo-100 text-indigo-700',
    dado_de_baja:      'bg-red-100 text-red-600',
    robo:              'bg-red-200 text-red-800',
  }
  const etiquetas: Record<string, string> = {
    disponible:       'Disponible',
    asignado:         'Asignado',
    en_mantenimiento: 'Mantenimiento',
    prestamo:         'Préstamo',
    dado_de_baja:     'Dado de baja',
    robo:             'Robo',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {etiquetas[estado] ?? estado}
    </span>
  )
}

// ── Links rápidos de categoría ────────────────────────────────────────────────

/**
 * Datos de cada tarjeta de categoría.
 * El `color` es el color de fondo hover del card.
 */
const CATEGORIAS = [
  { to: '/activos/categoria/equipos',   label: 'Equipos',   icono: '💻', color: 'hover:border-violet-300 hover:bg-violet-50' },
  { to: '/activos/categoria/celulares', label: 'Celulares', icono: '📱', color: 'hover:border-blue-300 hover:bg-blue-50'   },
  { to: '/activos/categoria/tablets',   label: 'Tablets',   icono: '📋', color: 'hover:border-pink-300 hover:bg-pink-50'   },
  { to: '/activos/categoria/licencias', label: 'Licencias', icono: '🔑', color: 'hover:border-cyan-300 hover:bg-cyan-50'   },
]

// ── Componente principal ──────────────────────────────────────────────────────

export default function ActivosPage() {
  const [activos, setActivos]   = useState<Activo[]>([])
  // cargando=true como valor inicial: la primera carga siempre parte en estado de espera
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // Toggle para incluir dados de baja — cuando se activa, recarga la lista completa
  const [verBaja, setVerBaja] = useState(false)

  // Filtros en cliente
  const [filtroCat,    setFiltroCat]    = useState<CategoriaActivo | ''>('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoActivo | ''>('')
  const [busqueda,     setBusqueda]     = useState('')

  // Modales
  const [modalCrear,        setModalCrear]        = useState(false)
  const [activoParaEditar,  setActivoParaEditar]  = useState<Activo | null>(null)
  const [activoParaDarBaja, setActivoParaDarBaja] = useState<Activo | null>(null)

  /**
   * Cargamos activos al montar y cada vez que cambia el toggle `verBaja`.
   * Si verBaja=true usamos getActivosConBaja() que incluye los retirados;
   * si es false usamos getActivos() que los excluye por defecto.
   *
   * No llamamos setState síncronamente aquí (lint react-hooks/set-state-in-effect).
   * El estado cargando=true inicial lo maneja useState(true).
   * En cambios posteriores de verBaja se muestran los datos anteriores mientras
   * llega la nueva respuesta — patrón stale-while-revalidate.
   */
  useEffect(() => {
    const cargar = verBaja ? getActivosConBaja : getActivos
    cargar()
      .then(data => {
        setActivos(data)
        setCargando(false)
        setError(null)
      })
      .catch((err: Error) => {
        setError(err.message)
        setCargando(false)
      })
  }, [verBaja])

  // ── Filtrado en cliente ───────────────────────────────────────────────────
  const activosFiltrados = activos.filter(a => {
    if (filtroCat    && a.categoria !== filtroCat)    return false
    if (filtroEstado && a.estado    !== filtroEstado) return false
    if (busqueda) {
      const norm = busqueda.toLowerCase()
      if (!a.nombre_equipo.toLowerCase().includes(norm)) return false
    }
    return true
  })

  const hayFiltros = !!(filtroCat || filtroEstado || busqueda)

  // ── Handler de exportación ───────────────────────────────────────────────

  /**
   * Exporta los activos actualmente visibles (respetando todos los filtros activos)
   * como archivo CSV. Solo incluye las columnas solicitadas — no IDs internos.
   */
  function handleExportarCsv() {
    const filas = activosFiltrados.map(a => ({
      nombre_equipo: a.nombre_equipo,
      categoria:     a.categoria,
      estado:        a.estado,
      marca:         a.marca         ?? '',
      modelo:        a.modelo        ?? '',
      procesador:    a.procesador    ?? '',
      ram:           a.ram           ?? '',
      disco:         a.disco         ?? '',
      mac:           a.mac           ?? '',
      imei:          a.imei          ?? '',
      fecha_entrega: a.fecha_entrega ?? '',
    }))
    exportarCsv('activos', filas)
  }

  // ── Handlers CRUD ─────────────────────────────────────────────────────────

  function handleCreado(nuevo: Activo) {
    setActivos(prev => [nuevo, ...prev])
    setModalCrear(false)
  }

  function handleEditado(editado: Activo) {
    setActivos(prev => prev.map(a => a.id === editado.id ? editado : a))
    setActivoParaEditar(null)
  }

  async function handleDarDeBaja() {
    if (!activoParaDarBaja) return
    try {
      await darDeBaja(activoParaDarBaja.id)
      // Si verBaja está activo, actualizamos el estado local para que se vea como "dado_de_baja".
      // Si está desactivado, lo sacamos de la lista (como antes).
      if (verBaja) {
        setActivos(prev =>
          prev.map(a => a.id === activoParaDarBaja.id ? { ...a, estado: 'dado_de_baja' as const } : a)
        )
      } else {
        setActivos(prev => prev.filter(a => a.id !== activoParaDarBaja.id))
      }
      setActivoParaDarBaja(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al dar de baja'
      setError(msg)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* ── Encabezado ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Activos</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activos.length} activo{activos.length !== 1 ? 's' : ''} en el inventario
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Exportar solo se habilita cuando hay resultados visibles */}
          <button
            onClick={handleExportarCsv}
            disabled={activosFiltrados.length === 0}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white
                       border border-slate-300 hover:bg-slate-50 rounded-lg
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↓ Exportar CSV
          </button>
          <button
            onClick={() => setModalCrear(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600
                       hover:bg-blue-700 rounded-lg transition-colors"
          >
            + Nuevo activo
          </button>
        </div>
      </div>

      {/* ── Links rápidos por categoría ────────────────────────────────────
           Cada card navega a la sub-página con la tabla completa de esa categoría */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {CATEGORIAS.map(cat => (
          <Link
            key={cat.to}
            to={cat.to}
            className={`flex items-center gap-2 px-4 py-3 bg-white border border-slate-200
                        rounded-lg text-sm font-medium text-slate-700 transition-colors ${cat.color}`}
          >
            <span className="text-base">{cat.icono}</span>
            <span>{cat.label}</span>
            <span className="ml-auto text-slate-400 text-xs">→</span>
          </Link>
        ))}
      </div>

      {/* ── Barra de filtros ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">

        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre..."
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg
                     placeholder:text-slate-400 text-slate-800
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     w-52"
        />

        <select
          value={filtroCat}
          onChange={e => setFiltroCat(e.target.value as CategoriaActivo | '')}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg
                     text-slate-700 bg-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todas las categorías</option>
          <option value="equipo">Equipo</option>
          <option value="celular">Celular</option>
          <option value="tablet">Tablet</option>
          <option value="licencia">Licencia</option>
        </select>

        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value as EstadoActivo | '')}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg
                     text-slate-700 bg-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todos los estados</option>
          <option value="disponible">Disponible</option>
          <option value="asignado">Asignado</option>
          <option value="en_mantenimiento">En mantenimiento</option>
          {/* Nuevos estados */}
          <option value="prestamo">Préstamo</option>
          <option value="robo">Robo</option>
          {/* Dado de baja solo aparece con sentido cuando verBaja está activo */}
          {verBaja && <option value="dado_de_baja">Dado de baja</option>}
        </select>

        {/* Toggle: mostrar/ocultar dados de baja — recarga datos del backend */}
        <button
          onClick={() => {
            setVerBaja(prev => !prev)
            // Limpiamos el filtro de estado para no quedar en un estado inválido
            setFiltroEstado('')
          }}
          className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            verBaja
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {verBaja ? '● Ver dados de baja' : '○ Ver dados de baja'}
        </button>

        {hayFiltros && (
          <span className="self-center text-xs text-slate-400">
            {activosFiltrados.length} resultado{activosFiltrados.length !== 1 ? 's' : ''}
          </span>
        )}

      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Contenido */}
      {cargando ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400 text-sm animate-pulse">Cargando activos...</p>
        </div>
      ) : activosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">
            {hayFiltros || verBaja
              ? 'No hay activos que coincidan con los filtros'
              : 'No hay activos registrados'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Marca / Modelo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {activosFiltrados.map(activo => (
                <tr
                  key={activo.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                    // Filas de dados de baja con opacidad reducida para distinción visual
                    activo.estado === 'dado_de_baja' || activo.estado === 'robo' ? 'opacity-60' : ''
                  }`}
                >

                  <td className="px-4 py-3">
                    <Link
                      to={`/activos/${activo.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {activo.nombre_equipo}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    <BadgeCategoria categoria={activo.categoria} />
                  </td>

                  <td className="px-4 py-3">
                    <BadgeEstado estado={activo.estado} />
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                    {[activo.marca, activo.modelo].filter(Boolean).join(' · ') || '—'}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        to={`/activos/${activo.id}`}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1
                                   rounded border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        Ver
                      </Link>
                      <button
                        onClick={() => setActivoParaEditar(activo)}
                        disabled={activo.estado === 'dado_de_baja' || activo.estado === 'robo'}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1
                                   rounded border border-slate-200 hover:border-slate-300
                                   transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Editar
                      </button>
                      {/* Dar de baja solo si no está ya dado de baja o robado */}
                      {activo.estado !== 'dado_de_baja' && activo.estado !== 'robo' && (
                        <button
                          onClick={() => setActivoParaDarBaja(activo)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1
                                     rounded border border-red-200 hover:border-red-300 transition-colors"
                        >
                          Dar de baja
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modales ──────────────────────────────────────────────────────── */}

      {modalCrear && (
        <ModalCrearActivo
          onClose={() => setModalCrear(false)}
          onCreado={handleCreado}
        />
      )}

      {activoParaEditar && (
        <ModalEditarActivo
          activo={activoParaEditar}
          onClose={() => setActivoParaEditar(null)}
          onEditado={handleEditado}
        />
      )}

      {activoParaDarBaja && (
        <ModalConfirmar
          titulo="Dar de baja activo"
          mensaje={`¿Estás seguro de que deseas dar de baja "${activoParaDarBaja.nombre_equipo}"? Esta acción no se puede deshacer desde la interfaz.`}
          labelConfirmar="Dar de baja"
          onConfirmar={handleDarDeBaja}
          onCancelar={() => setActivoParaDarBaja(null)}
        />
      )}

    </div>
  )
}
