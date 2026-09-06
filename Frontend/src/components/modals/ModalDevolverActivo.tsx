/**
 * ModalDevolverActivo.tsx
 *
 * Modal de confirmación para devolver un activo (cerrar una asignación).
 * Muestra el nombre del activo y la persona que lo tiene,
 * y permite agregar una nota opcional sobre la devolución.
 *
 * Al confirmar, llama PUT /api/asignaciones/:id/devolver a través del service.
 * El backend setea fecha_fin = now() y cambia el activo a 'disponible'.
 */

import { useState } from 'react'
import Modal from './Modal'
import { devolverActivo } from '../../api/asignacion.api'

interface Props {
  asignacionId: string     // UUID de la asignación activa a cerrar
  nombreActivo: string     // Para mostrar en el encabezado del modal
  nombrePersona: string    // Para mostrar a quién se le retira el activo
  onClose: () => void
  onDevuelto: () => void   // Notifica al padre para que recargue su estado
}

export default function ModalDevolverActivo({
  asignacionId,
  nombreActivo,
  nombrePersona,
  onClose,
  onDevuelto,
}: Props) {
  const [observaciones, setObservaciones] = useState('')
  const [guardando,     setGuardando]     = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      await devolverActivo(asignacionId, observaciones.trim() || undefined)
      onDevuelto()
      // El padre desmonta el modal, no necesitamos resetear estado
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al devolver el activo'
      setError(msg)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Devolver activo" onClose={onClose} ancho="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Resumen de la asignación que se va a cerrar */}
        <div className="bg-slate-50 rounded-lg p-4 text-sm">
          <p className="text-slate-500 mb-1">Activo</p>
          <p className="font-semibold text-slate-800">{nombreActivo}</p>
          <p className="text-slate-500 mt-2 mb-1">Asignado a</p>
          <p className="font-medium text-slate-700">{nombrePersona}</p>
        </div>

        {/* Observaciones de la devolución — opcional */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="obs_devolver" className="text-sm font-medium text-slate-700">
            Observaciones <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea
            id="obs_devolver"
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            disabled={guardando}
            rows={2}
            placeholder="Ej: Activo devuelto en buen estado..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                       placeholder:text-slate-400 text-slate-800 resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

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
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white
                       bg-amber-600 hover:bg-amber-700 rounded-lg
                       transition-colors disabled:bg-amber-400 disabled:cursor-not-allowed"
          >
            {guardando ? 'Procesando...' : 'Confirmar devolución'}
          </button>
        </div>

      </form>
    </Modal>
  )
}
