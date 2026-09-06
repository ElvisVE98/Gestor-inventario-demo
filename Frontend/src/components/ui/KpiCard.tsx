/**
 * KpiCard.tsx
 *
 * Tarjeta reutilizable para mostrar un KPI numérico (Key Performance Indicator).
 * Se usa en el Dashboard para mostrar totales como "activos disponibles", "personas activas", etc.
 *
 * Acepta una `variante` que define el color de acento (borde izquierdo + fondo + número).
 * Las clases Tailwind están escritas como strings literales completos para que el
 * scanner de Tailwind v4 las detecte correctamente (no se construyen dinámicamente).
 */

/**
 * Variantes de color disponibles para la tarjeta.
 * Cada variante corresponde a un color de Tailwind.
 */
type Variante =
  | 'azul'
  | 'verde'
  | 'amarillo'
  | 'naranja'
  | 'rojo'
  | 'violeta'
  | 'morado'
  | 'rosa'
  | 'cyan'
  | 'teal'
  | 'cielo'

interface KpiCardProps {
  titulo: string      // Etiqueta descriptiva del KPI, ej: "Activos disponibles"
  valor: number       // El número a mostrar prominentemente
  variante?: Variante // Color del acento. Por defecto: 'azul'
}

/**
 * Mapa de estilos Tailwind por variante.
 * Usamos un objeto en vez de construir clases dinámicamente para que Tailwind
 * pueda escanear y generar todas las clases en el build.
 */
const estilos: Record<Variante, { contenedor: string; numero: string }> = {
  azul:     { contenedor: 'border-l-4 border-blue-500 bg-blue-50',      numero: 'text-blue-700' },
  verde:    { contenedor: 'border-l-4 border-emerald-500 bg-emerald-50', numero: 'text-emerald-700' },
  amarillo: { contenedor: 'border-l-4 border-amber-500 bg-amber-50',     numero: 'text-amber-700' },
  naranja:  { contenedor: 'border-l-4 border-orange-500 bg-orange-50',   numero: 'text-orange-700' },
  rojo:     { contenedor: 'border-l-4 border-red-500 bg-red-50',         numero: 'text-red-700' },
  violeta:  { contenedor: 'border-l-4 border-violet-500 bg-violet-50',   numero: 'text-violet-700' },
  morado:   { contenedor: 'border-l-4 border-purple-500 bg-purple-50',   numero: 'text-purple-700' },
  rosa:     { contenedor: 'border-l-4 border-pink-500 bg-pink-50',       numero: 'text-pink-700' },
  cyan:     { contenedor: 'border-l-4 border-cyan-500 bg-cyan-50',       numero: 'text-cyan-700' },
  teal:     { contenedor: 'border-l-4 border-teal-500 bg-teal-50',       numero: 'text-teal-700' },
  cielo:    { contenedor: 'border-l-4 border-sky-500 bg-sky-50',         numero: 'text-sky-700' },
}

/**
 * Tarjeta de KPI con borde de color, título y valor numérico grande.
 */
export default function KpiCard({ titulo, valor, variante = 'azul' }: KpiCardProps) {
  // Tomamos los estilos del mapa según la variante elegida
  const estilo = estilos[variante]

  return (
    <div className={`${estilo.contenedor} rounded-lg p-5 shadow-sm`}>
      {/* Título descriptivo del KPI */}
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
        {titulo}
      </p>

      {/* El número principal — grande y en negrita para que sea lo primero que se vea */}
      <p className={`mt-2 text-4xl font-bold ${estilo.numero}`}>
        {valor.toLocaleString('es-CL')}
      </p>
    </div>
  )
}
