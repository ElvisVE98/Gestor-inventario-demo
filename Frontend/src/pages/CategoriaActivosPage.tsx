/**
 * CategoriaActivosPage.tsx
 *
 * Sub-página de detalle por categoría de activo.
 * Lee el parámetro de ruta :categoria (equipos | celulares | tablets | licencias)
 * y muestra una tabla horizontal con TODOS los campos relevantes de esa categoría.
 *
 * Rutas que usan esta página:
 *   /activos/categoria/equipos
 *   /activos/categoria/celulares
 *   /activos/categoria/tablets
 *   /activos/categoria/licencias
 *
 * La tabla tiene scroll horizontal porque la cantidad de columnas es grande.
 * Cada fila es clickeable y navega al detalle del activo.
 */

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getActivos } from '../services/activo.service'
import type { Activo, CategoriaActivo } from '../types/activo.types'
import { exportarCsv } from '../utils/exportarCsv'

// ── Mapa de categorías ────────────────────────────────────────────────────────

/**
 * Convierte el slug de la URL (plural, en español) a la categoría del backend.
 * Ej: "equipos" → "equipo"
 */
const SLUG_A_CATEGORIA: Record<string, CategoriaActivo> = {
  equipos:   'equipo',
  celulares: 'celular',
  tablets:   'tablet',
  licencias: 'licencia',
}

/** Título legible por categoría */
const TITULO: Record<string, string> = {
  equipos:   'Equipos',
  celulares: 'Celulares',
  tablets:   'Tablets',
  licencias: 'Licencias',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formatea una fecha ISO a dd/mm/aaaa. Devuelve '—' si es null. */
function fecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

/** Formatea costo en pesos chilenos. Devuelve '—' si es null. */
function costo(val: number | null): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
}

/** Muestra un valor string o '—' si es null/vacío. */
const v = (val: string | number | null | undefined): string =>
  val == null || val === '' ? '—' : String(val)

/** Muestra un booleano como 'Sí' / '—'. */
const bool = (val: boolean | null | undefined): string => val ? 'Sí' : '—'

// ── Badge de estado ───────────────────────────────────────────────────────────

/**
 * Badge compacto de estado del activo, igual que en ActivosPage.
 */
function BadgeEstado({ estado }: { estado: string }) {
  const clases: Record<string, string> = {
    disponible:       'bg-emerald-100 text-emerald-700',
    asignado:         'bg-amber-100 text-amber-700',
    en_mantenimiento: 'bg-orange-100 text-orange-700',
    prestamo:         'bg-indigo-100 text-indigo-700',
    dado_de_baja:     'bg-red-100 text-red-600',
    robo:             'bg-red-200 text-red-800',
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${clases[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {etiquetas[estado] ?? estado}
    </span>
  )
}

// ── Celda de tabla ────────────────────────────────────────────────────────────

/**
 * Celda estándar de dato — texto pequeño, centrado verticalmente.
 */
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap border-b border-slate-100 ${mono ? 'font-mono text-xs' : ''}`}>
      {children}
    </td>
  )
}

// ── Tablas por categoría ──────────────────────────────────────────────────────

/**
 * Tabla de equipos — muestra todos los campos técnicos de hardware + acceso remoto.
 */
function TablaEquipos({ activos }: { activos: Activo[] }) {
  return (
    <table className="w-full text-sm min-w-max">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-left">
          {['Nombre', 'Estado', 'Marca', 'Modelo', 'SO', 'Arq.', 'Procesador', 'Gen.', 'Año proc.', 'RAM', 'Disco',
            'MAC LAN', 'MAC WiFi', 'TeamViewer', 'AnyDesk',
            'Alza', 'Monitor', 'Mochila', 'Auriculares',
            'Costo', 'Fecha compra', 'Fecha entrega'].map(col => (
            <th key={col} className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {activos.map(a => (
          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
            <Td>
              <Link to={`/activos/${a.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                {a.nombre_equipo}
              </Link>
            </Td>
            <Td><BadgeEstado estado={a.estado} /></Td>
            <Td>{v(a.marca)}</Td>
            <Td>{v(a.modelo)}</Td>
            <Td>{v(a.sistema_operativo)}</Td>
            <Td>{v(a.arquitectura)}</Td>
            <Td>{v(a.procesador)}</Td>
            <Td>{v(a.generacion_procesador)}</Td>
            <Td>{v(a.anio_procesador)}</Td>
            <Td>{v(a.ram)}</Td>
            <Td>{v(a.disco)}</Td>
            <Td mono>{v(a.mac)}</Td>
            <Td mono>{v(a.mac_wifi)}</Td>
            <Td mono>{v(a.teamviewer)}</Td>
            <Td mono>{v(a.anydesk)}</Td>
            <Td>{bool(a.alza_notebook)}</Td>
            <Td>{bool(a.monitor_extra)}</Td>
            <Td>{bool(a.mochila)}</Td>
            <Td>{bool(a.auriculares)}</Td>
            <Td>{costo(a.costo)}</Td>
            <Td>{fecha(a.fecha_compra)}</Td>
            <Td>{fecha(a.fecha_entrega)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Tabla de celulares — identificación, IMEI, SO, datos de compra.
 */
function TablaCelulares({ activos }: { activos: Activo[] }) {
  return (
    <table className="w-full text-sm min-w-max">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-left">
          {['Nombre', 'Estado', 'Marca', 'Modelo', 'IMEI', 'SO', 'Año lanz.',
            'Costo', 'Fecha compra', 'Fecha entrega'].map(col => (
            <th key={col} className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {activos.map(a => (
          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
            <Td>
              <Link to={`/activos/${a.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                {a.nombre_equipo}
              </Link>
            </Td>
            <Td><BadgeEstado estado={a.estado} /></Td>
            <Td>{v(a.marca)}</Td>
            <Td>{v(a.modelo)}</Td>
            <Td mono>{v(a.imei)}</Td>
            <Td>{v(a.sistema_operativo)}</Td>
            <Td>{v(a.anio_lanzamiento)}</Td>
            <Td>{costo(a.costo)}</Td>
            <Td>{fecha(a.fecha_compra)}</Td>
            <Td>{fecha(a.fecha_entrega)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Tabla de tablets — hardware relevante + IMEI.
 */
function TablaTablets({ activos }: { activos: Activo[] }) {
  return (
    <table className="w-full text-sm min-w-max">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-left">
          {['Nombre', 'Estado', 'Marca', 'Modelo', 'IMEI', 'SO', 'Arq.',
            'RAM', 'Año lanz.', 'Costo', 'Fecha compra', 'Fecha entrega'].map(col => (
            <th key={col} className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {activos.map(a => (
          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
            <Td>
              <Link to={`/activos/${a.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                {a.nombre_equipo}
              </Link>
            </Td>
            <Td><BadgeEstado estado={a.estado} /></Td>
            <Td>{v(a.marca)}</Td>
            <Td>{v(a.modelo)}</Td>
            <Td mono>{v(a.imei)}</Td>
            <Td>{v(a.sistema_operativo)}</Td>
            <Td>{v(a.arquitectura)}</Td>
            <Td>{v(a.ram)}</Td>
            <Td>{v(a.anio_lanzamiento)}</Td>
            <Td>{costo(a.costo)}</Td>
            <Td>{fecha(a.fecha_compra)}</Td>
            <Td>{fecha(a.fecha_entrega)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Tabla de licencias — suite, tipo, observaciones. Sin compra.
 */
function TablaLicencias({ activos }: { activos: Activo[] }) {
  return (
    <table className="w-full text-sm min-w-max">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200 text-left">
          {['Nombre', 'Estado', 'Suite', 'Tipo licencia', 'Observaciones'].map(col => (
            <th key={col} className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {activos.map(a => (
          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
            <Td>
              <Link to={`/activos/${a.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                {a.nombre_equipo}
              </Link>
            </Td>
            <Td><BadgeEstado estado={a.estado} /></Td>
            <Td>{v(a.tipo_suite)}</Td>
            <Td>{v(a.tipo_licencia)}</Td>
            {/* Observaciones puede ser larga — la truncamos con un título para ver completo */}
            <td
              className="px-3 py-2.5 text-sm text-slate-600 border-b border-slate-100 max-w-xs truncate"
              title={a.especificaciones ?? ''}
            >
              {v(a.especificaciones)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Helper de exportación por categoría ──────────────────────────────────────

/**
 * Mapea un activo a las columnas relevantes según su categoría.
 * Cada categoría tiene campos distintos — exportamos exactamente lo que
 * muestra su tabla para que el CSV coincida con lo que el usuario ve.
 */
function mapearParaCsv(a: Activo, slug: string): Record<string, unknown> {
  // Campos comunes a todas las categorías
  const base = {
    nombre_equipo: a.nombre_equipo,
    estado:        a.estado,
    marca:         a.marca  ?? '',
    modelo:        a.modelo ?? '',
  }

  if (slug === 'equipos') {
    return {
      ...base,
      sistema_operativo:    a.sistema_operativo    ?? '',
      arquitectura:         a.arquitectura         ?? '',
      procesador:           a.procesador           ?? '',
      generacion_procesador: a.generacion_procesador ?? '',
      anio_procesador:      a.anio_procesador      ?? '',
      ram:                  a.ram                  ?? '',
      disco:                a.disco                ?? '',
      mac_lan:              a.mac                  ?? '',
      mac_wifi:             a.mac_wifi             ?? '',
      teamviewer:           a.teamviewer           ?? '',
      anydesk:              a.anydesk              ?? '',
      alza_notebook:        a.alza_notebook ? 'Sí' : '',
      monitor_extra:        a.monitor_extra ? 'Sí' : '',
      mochila:              a.mochila       ? 'Sí' : '',
      auriculares:          a.auriculares   ? 'Sí' : '',
      costo:                a.costo         ?? '',
      fecha_compra:         a.fecha_compra  ?? '',
      fecha_entrega:        a.fecha_entrega ?? '',
    }
  }

  if (slug === 'celulares') {
    return {
      ...base,
      imei:            a.imei             ?? '',
      sistema_operativo: a.sistema_operativo ?? '',
      anio_lanzamiento: a.anio_lanzamiento ?? '',
      costo:           a.costo            ?? '',
      fecha_compra:    a.fecha_compra     ?? '',
      fecha_entrega:   a.fecha_entrega    ?? '',
    }
  }

  if (slug === 'tablets') {
    return {
      ...base,
      imei:            a.imei              ?? '',
      sistema_operativo: a.sistema_operativo ?? '',
      arquitectura:    a.arquitectura      ?? '',
      ram:             a.ram               ?? '',
      anio_lanzamiento: a.anio_lanzamiento ?? '',
      costo:           a.costo             ?? '',
      fecha_compra:    a.fecha_compra      ?? '',
      fecha_entrega:   a.fecha_entrega     ?? '',
    }
  }

  // licencias
  return {
    nombre_equipo:   a.nombre_equipo,
    estado:          a.estado,
    tipo_suite:      a.tipo_suite      ?? '',
    tipo_licencia:   a.tipo_licencia   ?? '',
    especificaciones: a.especificaciones ?? '',
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CategoriaActivosPage() {
  const { categoria: slug } = useParams<{ categoria: string }>()
  const navigate = useNavigate()

  const [activos, setActivos]   = useState<Activo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [busqueda,setBusqueda] = useState('') // para barra de busqueda

  // Convertimos el slug de la URL a la categoría del backend
  const categoria = slug ? SLUG_A_CATEGORIA[slug] : undefined

  useEffect(() => {
    // Si la categoría no es válida, mandamos al listado general
    if (!categoria) {
      navigate('/activos', { replace: true })
      return
    }

    getActivos({ categoria })
      .then(data => {
        setActivos(data)
        setCargando(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setCargando(false)
      })
  }, [categoria, navigate])

  // ── Render ──────────────────────────────────────────────────────────────

  if (!slug || !SLUG_A_CATEGORIA[slug]) return null

  const titulo = TITULO[slug]


    const activosFiltrados = activos.filter(a =>{
    if(!busqueda) return true // si no hay texto, muestra todos
    const normalizada = busqueda.toLowerCase()
    return (
      a.nombre_equipo.toLowerCase().includes(normalizada) ||
      a.marca?.toLowerCase().includes(normalizada)        ||
      a.modelo?.toLowerCase().includes(normalizada)       ||
      a.mac?.toLowerCase().includes(normalizada)          ||
      a.estado.toLowerCase().includes(normalizada)        ||
      a.imei?.toLowerCase().includes(normalizada)
    )
  })





  return (
    <div className="p-8">

      {/* ── Encabezado con breadcrumb ──────────────────────────────────── */}
      <div className="mb-6">
        {/* Breadcrumb: Activos → Categoría */}
        <p className="text-xs text-slate-400 mb-1">
          <Link to="/activos" className="hover:text-slate-600 transition-colors">Activos</Link>
          <span className="mx-1">›</span>
          <span>{titulo}</span>
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">{titulo}</h1>
          <div className="flex items-center gap-3">
            {!cargando && (
              <p className="text-sm text-slate-400">
                {activos.length} registro{activos.length !== 1 ? 's' : ''}
              </p>
            )}
            {/* Botón habilitado solo cuando hay datos cargados */}
            {!cargando && activos.length > 0 && slug && (
              <button
                onClick={() => exportarCsv(slug, activos.map(a => mapearParaCsv(a, slug)))}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white
                           border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                ↓ Exportar CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
        <div className='mb-5'>
          <input 
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder='Buscar por nombre, Mac, Modelo, Marca o estado...'
          className='px-3 py-2 text-sm border border-slate-300 rounded-lg placeholder:text-slate-400 text-slate-800
          focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md'
           />
        </div>







      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Spinner */}
      {cargando && (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400 text-sm animate-pulse">Cargando {titulo.toLowerCase()}...</p>
        </div>
      )}

      {/* Tabla con scroll horizontal — los campos pueden ser muchos */}
      {!cargando && !error && (
        activos.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-sm">No hay {titulo.toLowerCase()} registrados</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            {/* Renderizamos la tabla específica según la categoría */}
            {slug === 'equipos'   && <TablaEquipos   activos={activosFiltrados} />}
            {slug === 'celulares' && <TablaCelulares activos={activosFiltrados} />}
            {slug === 'tablets'   && <TablaTablets   activos={activosFiltrados} />}
            {slug === 'licencias' && <TablaLicencias activos={activosFiltrados} />}
          </div>
        )
      )}

    </div>
  )
}
