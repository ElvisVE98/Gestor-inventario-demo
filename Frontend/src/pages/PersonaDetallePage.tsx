/**
 * PersonaDetallePage.tsx
 *
 * Página de detalle de una persona.
 * Muestra todos sus datos y los activos que tiene asignados actualmente,
 * agrupados por categoría.
 *
 * Acciones disponibles desde esta página:
 *   - "Asignar activo" → abre ModalAsignarActivo con la persona pre-seleccionada
 *   - "Devolver" en cada activo → abre ModalDevolverActivo con el activo pre-seleccionado
 * Tras cada acción recarga los datos de la persona sin navegar.
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPersonaById } from '../services/persona.service'
import type { PersonaConActivos, ActivoAsignado } from '../types/persona.types'
import ModalAsignarActivo  from '../components/ModalAsignarActivo'
import ModalDevolverActivo from '../components/ModalDevolverActivo'

/**
 * Convierte un timestamp ISO 8601 a fecha legible en formato chileno.
 * Ej: "2024-01-15T09:00:00Z" → "15/01/2024"
 */
function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Nombres legibles para cada categoría de activo.
 * Se usa en los encabezados de cada grupo.
 */
const NOMBRE_CATEGORIA: Record<string, string> = {
  equipo:   'Equipos',
  celular:  'Celulares',
  tablet:   'Tablets',
  licencia: 'Licencias',
}

/**
 * Ícono simple para cada categoría.
 */
const ICONO_CATEGORIA: Record<string, string> = {
  equipo:   '▣',
  celular:  '▢',
  tablet:   '◫',
  licencia: '◈',
}

/**
 * Fila de un activo dentro de un grupo de categoría.
 * El callback onDevolver abre el modal de devolución para este activo.
 */
function FilaActivo({
  activo,
  onDevolver,
}: {
  activo: ActivoAsignado
  onDevolver: (activo: ActivoAsignado) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4
                    border-b border-slate-100 last:border-0
                    hover:bg-slate-50 transition-colors">

      {/* Nombre del equipo — link a la página de detalle del activo */}
      <div className="flex items-center gap-3">
        <Link
          to={`/activos/${activo.activo_id}`}
          className="font-medium text-blue-600 hover:text-blue-800 text-sm"
        >
          {activo.nombre_equipo}
        </Link>
        {activo.modelo && (
          <span className="text-slate-400 text-xs">{activo.modelo}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Fecha desde cuando tiene el activo */}
        <span className="text-xs text-slate-400">
          Desde {formatearFecha(activo.fecha_inicio)}
        </span>
        {/* Botón devolver — abre modal con este activo pre-seleccionado */}
        <button
          onClick={() => onDevolver(activo)}
          className="text-xs text-amber-600 hover:text-amber-800 px-2 py-1
                     rounded border border-amber-200 hover:border-amber-300
                     bg-amber-50 hover:bg-amber-100 transition-colors"
        >
          Devolver
        </button>
      </div>

    </div>
  )
}

/**
 * Grupo de activos de una misma categoría.
 * El botón "Asignar" en el encabezado abre el modal con la persona ya pre-seleccionada.
 */
function GrupoCategoria({
  categoria,
  activos,
  onAsignar,
  onDevolver,
}: {
  categoria: string
  activos: ActivoAsignado[]
  onAsignar: () => void
  onDevolver: (activo: ActivoAsignado) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Encabezado del grupo */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <span className="text-slate-400">{ICONO_CATEGORIA[categoria] ?? '▪'}</span>
        <h3 className="text-sm font-semibold text-slate-700">
          {NOMBRE_CATEGORIA[categoria] ?? categoria}
        </h3>
        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {activos.length}
        </span>
        {/* Botón "Asignar activo" — abre el modal con la persona pre-seleccionada */}
        <button
          onClick={onAsignar}
          className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800
                     transition-colors"
        >
          + Asignar activo
        </button>
      </div>
      {/* Lista de activos */}
      {activos.map(activo => (
        <FilaActivo key={activo.asignacion_id} activo={activo} onDevolver={onDevolver} />
      ))}
    </div>
  )
}

export default function PersonaDetallePage() {
  const { id } = useParams<{ id: string }>()

  const [persona,   setPersona]  = useState<PersonaConActivos | null>(null)
  const [cargando,  setCargando] = useState(true)
  const [error,     setError]    = useState<string | null>(null)

  // Modal asignar — se abre siempre con la persona pre-seleccionada
  const [modalAsignar, setModalAsignar] = useState(false)

  // Modal devolver — guarda el activo que se va a devolver
  const [activoADevolver, setActivoADevolver] = useState<ActivoAsignado | null>(null)

  /**
   * Contador de recarga — al incrementarlo se re-ejecuta el useEffect.
   * Los callbacks de modales lo incrementan para forzar una recarga
   * sin necesitar una referencia a cargarDatos() fuera del useEffect.
   */
  const [clave, setClave] = useState(0)

  /**
   * Carga los datos de la persona.
   * La función está definida DENTRO del useEffect para evitar el warning
   * de react-hooks/exhaustive-deps.
   */
  useEffect(() => {
    if (!id) return

    const cargar = async () => {
      setCargando(true)
      try {
        const data = await getPersonaById(id)
        setPersona(data)
        setError(null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [id, clave])  // clave se incrementa desde los callbacks de modal para forzar recarga

  // ── Estados de carga y error ───────────────────────────────────────────

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm animate-pulse">Cargando datos...</p>
      </div>
    )
  }

  if (error || !persona) {
    return (
      <div className="p-8">
        <Link to="/personas" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← Volver a personas
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">No se pudo cargar la persona</p>
          <p className="text-red-500 text-sm mt-1">{error ?? 'Persona no encontrada'}</p>
        </div>
      </div>
    )
  }

  // ── Agrupar activos por categoría ─────────────────────────────────────
  // Construimos un mapa { equipo: [...], celular: [...], ... }
  // Solo incluimos categorías que tienen al menos un activo
  const porCategoria = persona.activos_asignados.reduce<Record<string, ActivoAsignado[]>>(
    (acc, activo) => {
      if (!acc[activo.categoria]) acc[activo.categoria] = []
      acc[activo.categoria].push(activo)
      return acc
    },
    {}
  )

  // Ordenamos las categorías de forma fija para que siempre aparezcan en el mismo orden
  const ordenCategorias = ['equipo', 'celular', 'tablet', 'licencia']
  const categoriasPresentes = ordenCategorias.filter(cat => porCategoria[cat]?.length > 0)

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-4xl">

      {/* Botón volver */}
      <Link
        to="/personas"
        className="inline-flex items-center gap-1 text-sm text-slate-500
                   hover:text-slate-700 mb-6 transition-colors"
      >
        ← Volver a personas
      </Link>

      {/* ── Tarjeta de datos de la persona ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">

        {/* Nombre y estado */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{persona.nombre}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{persona.cargo}</p>
          </div>
          {/* Badge de estado */}
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
            ${persona.estado === 'activo'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'}`}>
            {persona.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Grid de datos */}
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">

          <div>
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">RUT</dt>
            <dd className="font-mono text-slate-700">{persona.rut}</dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Correo</dt>
            <dd className="text-slate-700 truncate">{persona.correo}</dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Sucursal</dt>
            <dd className="text-slate-700">{persona.sucursal}</dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Centro de costo</dt>
            <dd className="text-slate-700">{persona.centro_costo}</dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Activos asignados</dt>
            <dd className="text-slate-700 font-semibold">{persona.activos_asignados.length}</dd>
          </div>

        </dl>
      </div>

      {/* ── Activos asignados ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
            Activos asignados
          </h2>
          {/* Botón general "Asignar activo" — útil cuando la persona no tiene ninguno */}
          {persona.estado === 'activo' && (
            <button
              onClick={() => setModalAsignar(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600
                         hover:bg-blue-700 rounded-lg transition-colors"
            >
              + Asignar activo
            </button>
          )}
        </div>

        {categoriasPresentes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">
              Esta persona no tiene activos asignados actualmente
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {categoriasPresentes.map(cat => (
              <GrupoCategoria
                key={cat}
                categoria={cat}
                activos={porCategoria[cat]}
                onAsignar={() => setModalAsignar(true)}
                onDevolver={setActivoADevolver}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modales de asignación y devolución ────────────────────────── */}

      {modalAsignar && persona && (
        <ModalAsignarActivo
          personaPreseleccionada={{ id: persona.id, nombre: persona.nombre }}
          onClose={() => setModalAsignar(false)}
          onAsignado={() => {
            // Incrementar clave re-ejecuta el useEffect → recarga activos de la persona
            setModalAsignar(false)
            setClave(c => c + 1)
          }}
        />
      )}

      {activoADevolver && persona && (
        <ModalDevolverActivo
          asignacionId={activoADevolver.asignacion_id}
          nombreActivo={activoADevolver.nombre_equipo}
          nombrePersona={persona.nombre}
          onClose={() => setActivoADevolver(null)}
          onDevuelto={() => {
            // Incrementar clave re-ejecuta el useEffect → recarga activos de la persona
            setActivoADevolver(null)
            setClave(c => c + 1)
          }}
        />
      )}

    </div>
  )
}
