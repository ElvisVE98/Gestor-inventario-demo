/**
 * ModalAsignarActivo.tsx
 *
 * Formulario modal para crear una asignación (vincular un activo a una persona).
 *
 * Se usa desde dos lugares con pre-selección diferente:
 *   - ActivoDetallePage: activo ya conocido → solo muestra dropdown de personas
 *   - PersonaDetallePage: persona ya conocida → solo muestra dropdown de activos disponibles
 *
 * Si ninguno viene pre-seleccionado, muestra ambos dropdowns (caso general).
 * Al guardar, llama onAsignado() para que la página padre refresque su estado.
 */

import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import Modal from './Modal'
import { getPersonas } from '../services/persona.service'
import { getActivos } from '../services/activo.service'
import { crearAsignacion } from '../services/asignacion.service'
import type { Persona } from '../types/persona.types'
import type { Activo } from '../types/activo.types'
import type { AsignacionConDetalle } from '../types/asignacion.types'

interface Props {
  onClose: () => void
  onAsignado: (asignacion: AsignacionConDetalle) => void
  // Pre-selección opcional: si viene, ese dropdown se muestra fijo (no editable)
  activoPreseleccionado?: { id: string; nombre: string }
  personaPreseleccionada?: { id: string; nombre: string }
}

export default function ModalAsignarActivo({
  onClose,
  onAsignado,
  activoPreseleccionado,
  personaPreseleccionada,
}: Props) {
  // Datos para los dropdowns — se cargan al abrir el modal
  const [personas,  setPersonas]  = useState<Persona[]>([])
  const [activos,   setActivos]   = useState<Activo[]>([])
  const [cargandoOpciones, setCargandoOpciones] = useState(true)

  // Valores del formulario
  const [personaId,    setPersonaId]    = useState(personaPreseleccionada?.id ?? '')
  const [activoId,     setActivoId]     = useState(activoPreseleccionado?.id  ?? '')
  const [fechaInicio,  setFechaInicio]  = useState(hoy())   // default: hoy
  const [observaciones, setObservaciones] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Cargamos personas y/o activos según lo que no venga pre-seleccionado
  useEffect(() => {
    const tareas: Promise<void>[] = []

    if (!personaPreseleccionada) {
      tareas.push(
        getPersonas().then(setPersonas)
      )
    }

    if (!activoPreseleccionado) {
      // Solo activos disponibles — no se pueden asignar los que ya están asignados
      tareas.push(
        getActivos({ estado: 'disponible' }).then(setActivos)
      )
    }

    Promise.all(tareas).finally(() => setCargandoOpciones(false))
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  // La dependencia es vacía a propósito — los props de pre-selección no cambian

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!personaId || !activoId) return

    setError(null)
    setGuardando(true)

    try {
      const nueva = await crearAsignacion({
        persona_id:   personaId,
        activo_id:    activoId,
        // Solo incluimos fecha_inicio si el usuario la cambió del default
        fecha_inicio: fechaInicio ? `${fechaInicio}T00:00:00` : undefined,
        observaciones: observaciones.trim() || undefined,
      })
      onAsignado(nueva)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la asignación'
      setError(msg)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Asignar activo" onClose={onClose} ancho="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {cargandoOpciones ? (
          <p className="text-sm text-slate-400 text-center py-4 animate-pulse">
            Cargando datos...
          </p>
        ) : (
          <>
            {/* ── Persona ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Persona <span className="text-red-500">*</span>
              </label>
              {personaPreseleccionada ? (
                // Persona fija — se muestra como campo de solo lectura
                <input
                  value={personaPreseleccionada.nombre}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                             bg-slate-50 text-slate-400"
                />
              ) : (
                // Dropdown de personas activas
                <select
                  value={personaId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setPersonaId(e.target.value)}
                  required
                  disabled={guardando}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                             text-slate-800 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Seleccionar persona...</option>
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — {p.cargo}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ── Activo ───────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Activo <span className="text-red-500">*</span>
              </label>
              {activoPreseleccionado ? (
                // Activo fijo — se muestra como campo de solo lectura
                <input
                  value={activoPreseleccionado.nombre}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                             bg-slate-50 text-slate-400"
                />
              ) : (
                // Dropdown de activos disponibles
                <select
                  value={activoId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setActivoId(e.target.value)}
                  required
                  disabled={guardando}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                             text-slate-800 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Seleccionar activo...</option>
                  {activos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre_equipo}
                      {a.marca  ? ` — ${a.marca}` : ''}
                      {a.modelo ? ` ${a.modelo}`  : ''}
                    </option>
                  ))}
                </select>
              )}
              {/* Aviso si no hay activos disponibles */}
              {!activoPreseleccionado && activos.length === 0 && !cargandoOpciones && (
                <p className="text-xs text-amber-600">No hay activos disponibles para asignar</p>
              )}
            </div>

            {/* ── Fecha de inicio ───────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fecha_inicio" className="text-sm font-medium text-slate-700">
                Fecha de inicio
              </label>
              <input
                id="fecha_inicio"
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                disabled={guardando}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                           text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            {/* ── Observaciones ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="obs_asignar" className="text-sm font-medium text-slate-700">
                Observaciones <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="obs_asignar"
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                disabled={guardando}
                rows={2}
                placeholder="Ej: Activo entregado con funda incluida..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                           placeholder:text-slate-400 text-slate-800 resize-none
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </>
        )}

        {/* Error del backend */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-slate-600
                       border border-slate-300 rounded-lg hover:bg-slate-50
                       transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || cargandoOpciones || !personaId || !activoId}
            className="px-4 py-2 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 rounded-lg
                       transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {guardando ? 'Asignando...' : 'Confirmar asignación'}
          </button>
        </div>

      </form>
    </Modal>
  )
}

/** Devuelve la fecha de hoy en formato YYYY-MM-DD para el input type="date" */
function hoy(): string {
  return new Date().toISOString().split('T')[0]
}
