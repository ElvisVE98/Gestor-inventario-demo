/**
 * ActivoDetallePage.tsx
 *
 * Página de detalle de un activo.
 * Muestra tres secciones:
 *   1. Ficha técnica — campos agrupados según la categoría del activo
 *   2. Persona asignada actualmente + botones Asignar / Devolver según estado
 *   3. Historial de asignaciones — todas, de más reciente a más antigua
 *
 * Hace dos llamadas en paralelo: getActivoById() + getAsignacionesPorActivo().
 * Tras una asignación o devolución, recarga el activo sin navegar.
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getActivoById } from '../services/activo.service'
import { getAsignacionesPorActivo } from '../services/asignacion.service'
import type { ActivoDetalle } from '../types/activo.types'
import type { AsignacionConDetalle } from '../types/asignacion.types'
import ModalAsignarActivo  from '../components/ModalAsignarActivo'
import ModalDevolverActivo from '../components/ModalDevolverActivo'

// ── Helpers de formato ────────────────────────────────────────────────────────

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatearCosto(costo: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(costo)
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

/**
 * Un campo de la ficha técnica: etiqueta + valor.
 * Si value es null/undefined/'', no renderiza nada (evita filas vacías).
 */
function Campo({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value == null || value === '') return null

  let texto: string
  if (typeof value === 'boolean') texto = value ? 'Sí' : 'No'
  else texto = String(value)

  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-700 font-mono">{texto}</dd>
    </div>
  )
}

/**
 * Bloque con título de sección y grid de campos.
 */
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{titulo}</p>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {children}
      </dl>
    </div>
  )
}

/**
 * Badge de estado del activo — igual que en ActivosPage para consistencia visual.
 */
function BadgeEstado({ estado }: { estado: string }) {
  const clases: Record<string, string> = {
    disponible:       'bg-emerald-100 text-emerald-700',
    asignado:         'bg-amber-100 text-amber-700',
    en_mantenimiento: 'bg-orange-100 text-orange-700',
    dado_de_baja:     'bg-red-100 text-red-600',
  }
  const etiquetas: Record<string, string> = {
    disponible:       'Disponible',
    asignado:         'Asignado',
    en_mantenimiento: 'En mantenimiento',
    dado_de_baja:     'Dado de baja',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {etiquetas[estado] ?? estado}
    </span>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ActivoDetallePage() {
  const { id } = useParams<{ id: string }>()

  const [activo,      setActivo]      = useState<ActivoDetalle | null>(null)
  const [historial,   setHistorial]   = useState<AsignacionConDetalle[]>([])
  const [cargando,    setCargando]    = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // Modales de asignación / devolución
  const [modalAsignar,  setModalAsignar]  = useState(false)
  const [modalDevolver, setModalDevolver] = useState(false)

  /**
   * Contador de recarga — al incrementarlo se re-ejecuta el useEffect.
   * Los callbacks de modales (onAsignado, onDevuelto) lo incrementan
   * para forzar una recarga sin llamar a cargarDatos() directamente.
   */
  const [clave, setClave] = useState(0)

  /**
   * Carga el activo y su historial en paralelo.
   * La función está definida DENTRO del useEffect para evitar el warning
   * de react-hooks/exhaustive-deps (si estuviera fuera, habría que listarla
   * como dependencia o suprimir el warning con un comentario).
   */
  useEffect(() => {
    if (!id) return

    const cargar = async () => {
      setCargando(true)
      try {
        const [a, h] = await Promise.all([
          getActivoById(id),
          getAsignacionesPorActivo(id),
        ])
        setActivo(a)
        // Ordenamos de más reciente a más antigua para leer el historial de arriba a abajo
        setHistorial(h.sort((x, y) => y.fecha_inicio.localeCompare(x.fecha_inicio)))
        setError(null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [id, clave])  // clave se incrementa desde los callbacks de modal para forzar recarga

  // ── Estados de carga / error ──────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm animate-pulse">Cargando datos...</p>
      </div>
    )
  }

  if (error || !activo) {
    return (
      <div className="p-8">
        <Link to="/activos" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← Volver a activos
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">No se pudo cargar el activo</p>
          <p className="text-red-500 text-sm mt-1">{error ?? 'Activo no encontrado'}</p>
        </div>
      </div>
    )
  }

  const cat = activo.categoria

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-4xl">

      {/* Botón volver */}
      <Link
        to="/activos"
        className="inline-flex items-center gap-1 text-sm text-slate-500
                   hover:text-slate-700 mb-6 transition-colors"
      >
        ← Volver a activos
      </Link>

      {/* ── Encabezado del activo ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{activo.nombre_equipo}</h1>
            <p className="text-slate-400 text-sm mt-0.5 capitalize">{activo.categoria}</p>
          </div>
          <BadgeEstado estado={activo.estado} />
        </div>

        {/* ── Ficha técnica por categoría ───────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Datos comunes a todas las categorías */}
          <Seccion titulo="General">
            <Campo label="Marca"           value={activo.marca} />
            <Campo label="Modelo"          value={activo.modelo} />
            <Campo label="Año lanzamiento" value={activo.anio_lanzamiento} />
            <Campo label="Registrado"      value={formatearFecha(activo.created_at)} />
          </Seccion>

          {/* Equipo: red + acceso remoto + hardware + accesorios */}
          {cat === 'equipo' && (
            <>
              {(activo.mac || activo.mac_wifi) && (
                <Seccion titulo="Red">
                  <Campo label="MAC (LAN)"   value={activo.mac} />
                  <Campo label="MAC (Wi-Fi)" value={activo.mac_wifi} />
                </Seccion>
              )}

              {(activo.teamviewer || activo.anydesk) && (
                <Seccion titulo="Acceso remoto">
                  <Campo label="TeamViewer ID" value={activo.teamviewer} />
                  <Campo label="AnyDesk ID"    value={activo.anydesk} />
                </Seccion>
              )}

              {(activo.sistema_operativo || activo.procesador || activo.ram) && (
                <Seccion titulo="Hardware">
                  <Campo label="SO"            value={activo.sistema_operativo} />
                  <Campo label="Arquitectura"  value={activo.arquitectura} />
                  <Campo label="Procesador"    value={activo.procesador} />
                  <Campo label="Generación"    value={activo.generacion_procesador} />
                  <Campo label="Año CPU"       value={activo.anio_procesador} />
                  <Campo label="RAM"           value={activo.ram} />
                  <Campo label="Disco"         value={activo.disco} />
                </Seccion>
              )}

              {(activo.alza_notebook || activo.monitor_extra || activo.mochila || activo.auriculares) && (
                <Seccion titulo="Accesorios">
                  <Campo label="Alza notebook" value={activo.alza_notebook} />
                  <Campo label="Monitor extra"  value={activo.monitor_extra} />
                  <Campo label="Mochila"        value={activo.mochila} />
                  <Campo label="Auriculares"    value={activo.auriculares} />
                </Seccion>
              )}
            </>
          )}

          {/* Tablet: hardware básico */}
          {cat === 'tablet' && (activo.sistema_operativo || activo.ram) && (
            <Seccion titulo="Hardware">
              <Campo label="SO"           value={activo.sistema_operativo} />
              <Campo label="Arquitectura" value={activo.arquitectura} />
              <Campo label="RAM"          value={activo.ram} />
              <Campo label="IMEI"         value={activo.imei} />
            </Seccion>
          )}

          {/* Celular: SO + IMEI */}
          {cat === 'celular' && (activo.sistema_operativo || activo.imei) && (
            <Seccion titulo="Dispositivo">
              <Campo label="SO"   value={activo.sistema_operativo} />
              <Campo label="IMEI" value={activo.imei} />
            </Seccion>
          )}

          {/* Licencia */}
          {cat === 'licencia' && (activo.tipo_suite || activo.tipo_licencia) && (
            <Seccion titulo="Licencia">
              <Campo label="Suite"         value={activo.tipo_suite} />
              <Campo label="Tipo licencia" value={activo.tipo_licencia} />
            </Seccion>
          )}

          {/* Compra — aplica a todas las categorías */}
          {(activo.tipo_documento || activo.costo || activo.fecha_compra) && (
            <Seccion titulo="Compra">
              <Campo label="Tipo documento" value={activo.tipo_documento} />
              <Campo label="N° factura"     value={activo.numero_factura} />
              <Campo label="Costo"          value={activo.costo != null ? formatearCosto(activo.costo) : null} />
              <Campo label="Fecha compra"   value={activo.fecha_compra ? formatearFecha(activo.fecha_compra) : null} />
              <Campo label="Fecha entrega"  value={activo.fecha_entrega ? formatearFecha(activo.fecha_entrega) : null} />
              {activo.acta_entrega_url && (
                <div>
                  <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Acta entrega</dt>
                  <dd>
                    <a
                      href={activo.acta_entrega_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Ver documento
                    </a>
                  </dd>
                </div>
              )}
            </Seccion>
          )}

          {/* Notas */}
          {activo.especificaciones && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Notas</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{activo.especificaciones}</p>
            </div>
          )}

        </div>
      </div>

      {/* ── Persona asignada actualmente + acciones ───────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
            Asignación actual
          </h2>

          {/* Botón Asignar — solo si el activo está disponible */}
          {activo.estado === 'disponible' && (
            <button
              onClick={() => setModalAsignar(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600
                         hover:bg-blue-700 rounded-lg transition-colors"
            >
              + Asignar
            </button>
          )}
        </div>

        {activo.persona_asignada ? (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  to={`/personas/${activo.persona_asignada.persona_id}`}
                  className="font-medium text-blue-600 hover:text-blue-800 text-sm"
                >
                  {activo.persona_asignada.nombre}
                </Link>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activo.persona_asignada.cargo} · RUT {activo.persona_asignada.rut}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  Desde {formatearFecha(activo.persona_asignada.fecha_inicio)}
                </span>
                {/* Botón Devolver — solo si hay asignación activa */}
                <button
                  onClick={() => setModalDevolver(true)}
                  className="px-3 py-1.5 text-xs font-medium text-amber-700
                             bg-amber-50 hover:bg-amber-100 border border-amber-200
                             rounded-lg transition-colors"
                >
                  Devolver
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
            <p className="text-sm text-slate-400">Este activo no tiene una asignación activa</p>
          </div>
        )}
      </div>

      {/* ── Historial de asignaciones ─────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Historial de asignaciones
        </h2>

        {historial.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Este activo nunca ha sido asignado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {historial.map(asig => (
              <div
                key={asig.id}
                className="flex items-center justify-between px-5 py-3.5
                           border-b border-slate-100 last:border-0"
              >
                <div>
                  <Link
                    to={`/personas/${asig.persona_id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {asig.persona.nombre}
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {asig.persona.cargo} · {asig.persona.sucursal}
                  </p>
                </div>

                {/* Período de la asignación */}
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {formatearFecha(asig.fecha_inicio)} →{' '}
                    {asig.fecha_fin ? formatearFecha(asig.fecha_fin) : (
                      <span className="text-emerald-600 font-medium">activa</span>
                    )}
                  </p>
                  {asig.observaciones && (
                    <p className="text-xs text-slate-400 mt-0.5 italic">{asig.observaciones}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modales de asignación y devolución ────────────────────────── */}

      {modalAsignar && (
        <ModalAsignarActivo
          activoPreseleccionado={{ id: activo.id, nombre: activo.nombre_equipo }}
          onClose={() => setModalAsignar(false)}
          onAsignado={() => {
            // Incrementar clave re-ejecuta el useEffect → recarga activo + historial
            setModalAsignar(false)
            setClave(c => c + 1)
          }}
        />
      )}

      {modalDevolver && activo.persona_asignada && (
        <ModalDevolverActivo
          asignacionId={activo.persona_asignada.asignacion_id}
          nombreActivo={activo.nombre_equipo}
          nombrePersona={activo.persona_asignada.nombre}
          onClose={() => setModalDevolver(false)}
          onDevuelto={() => {
            // Incrementar clave re-ejecuta el useEffect → recarga activo + historial
            setModalDevolver(false)
            setClave(c => c + 1)
          }}
        />
      )}

    </div>
  )
}
