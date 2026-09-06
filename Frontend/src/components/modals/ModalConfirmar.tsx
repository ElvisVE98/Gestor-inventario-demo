/**
 * ModalConfirmar.tsx
 *
 * Modal de confirmación genérico para acciones destructivas o irreversibles.
 * Se usa antes de desactivar una persona, dar de baja un activo, etc.
 *
 * Muestra un título, un mensaje descriptivo y dos botones: Cancelar y Confirmar.
 * El botón de confirmar muestra "Procesando..." mientras espera la respuesta del backend.
 */

import { useState } from 'react'
import Modal from './Modal'

interface ModalConfirmarProps {
  titulo: string                      // Título del modal, ej: "Desactivar persona"
  mensaje: string                     // Pregunta o descripción del impacto de la acción
  labelConfirmar?: string             // Texto del botón de confirmación. Default: "Confirmar"
  onConfirmar: () => Promise<void>    // Acción async a ejecutar al confirmar
  onCancelar: () => void              // Cierra el modal sin hacer nada
}

/**
 * Modal de confirmación con estados de carga y error integrados.
 */
export default function ModalConfirmar({
  titulo,
  mensaje,
  labelConfirmar = 'Confirmar',
  onConfirmar,
  onCancelar,
}: ModalConfirmarProps) {
  // Estado de carga durante la ejecución de la acción confirmada
  const [procesando, setProcesando] = useState(false)

  // Mensaje de error si la acción falla
  const [error, setError] = useState<string | null>(null)

  /**
   * Ejecuta la acción y maneja el estado de carga y posibles errores.
   */
  async function handleConfirmar() {
    setError(null)
    setProcesando(true)

    try {
      await onConfirmar()
      // Si llegamos aquí, la acción fue exitosa — el padre cerrará el modal
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al procesar la acción'
      setError(mensaje)
      setProcesando(false) // Solo reseteamos si hay error — si hay éxito, el padre desmonta el modal
    }
  }

  return (
    <Modal titulo={titulo} onClose={onCancelar} ancho="sm">

      {/* Mensaje descriptivo de la acción */}
      <p className="text-sm text-slate-600 mb-4">{mensaje}</p>

      {/* Error si la acción falló */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancelar}
          disabled={procesando}
          className="px-4 py-2 text-sm font-medium text-slate-600
                     border border-slate-300 rounded-lg hover:bg-slate-50
                     transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>

        {/* Botón destructivo en rojo para que el usuario note el riesgo */}
        <button
          onClick={handleConfirmar}
          disabled={procesando}
          className="px-4 py-2 text-sm font-medium text-white
                     bg-red-600 hover:bg-red-700 rounded-lg
                     transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
        >
          {procesando ? 'Procesando...' : labelConfirmar}
        </button>
      </div>

    </Modal>
  )
}
