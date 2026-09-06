/**
 * Modal.tsx
 *
 * Componente base para todos los modales de la aplicación.
 * Provee el overlay oscuro, la tarjeta centrada y el encabezado con título y botón de cierre.
 * Los modales específicos (crear, editar, confirmar) usan este como envoltorio.
 *
 * Por qué un componente base:
 *   Los 3+ modales del proyecto comparten el mismo overlay, tamaño, sombra y header.
 *   Centralizarlo aquí evita repetir ~20 líneas de Tailwind en cada modal
 *   y garantiza que todos se vean y se comporten de forma consistente.
 */

interface ModalProps {
  titulo: string                  // Texto del encabezado del modal
  onClose: () => void             // Función que cierra el modal (botón X)
  children: React.ReactNode       // Contenido interno (formulario, mensaje, etc.)
  ancho?: 'sm' | 'md' | 'lg'     // Ancho máximo. Por defecto 'md'
  scrollable?: boolean            // Si true, el cuerpo del modal tiene scroll para formularios largos
}

/**
 * Mapa de clases Tailwind por variante de ancho.
 * Usamos strings literales para que Tailwind v4 los detecte en el scanner.
 */
const anchoClases = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

/**
 * Modal base con overlay, tarjeta centrada y encabezado.
 */
export default function Modal({ titulo, onClose, children, ancho = 'md', scrollable = false }: ModalProps) {
  return (
    // Overlay: cubre toda la pantalla con fondo semitransparente
    // z-50 para estar por encima de todo el contenido de la página
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">

      {/* Tarjeta del modal */}
      <div className={`bg-white rounded-xl shadow-xl w-full ${anchoClases[ancho]} flex flex-col`}>

        {/* Encabezado: título + botón de cierre */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{titulo}</h2>
          <button
            onClick={onClose}
            // aria-label para accesibilidad — el botón solo tiene un "×" como texto
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-slate-600 text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Contenido — cada modal pone aquí su formulario o mensaje */}
        {/* scrollable=true activa overflow-y-auto + max-h para formularios largos (ej: activos) */}
        <div className={`px-6 py-5 ${scrollable ? 'overflow-y-auto max-h-[65vh]' : ''}`}>
          {children}
        </div>

      </div>
    </div>
  )
}
