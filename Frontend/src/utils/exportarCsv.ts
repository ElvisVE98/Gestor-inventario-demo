/**
 * exportarCsv.ts
 *
 * Utilidad para exportar un array de objetos como archivo CSV descargable.
 * La conversión ocurre 100% en el navegador — sin llamadas al backend.
 *
 * Cumple RFC 4180 para CSV:
 *   - Separador: coma
 *   - Fin de línea: CRLF (\r\n)
 *   - Valores con coma, comilla o saltos de línea van entre comillas dobles
 *   - Las comillas internas se escapan duplicándolas: " → ""
 *
 * Agrega BOM (U+FEFF) al inicio para que Excel abra UTF-8 correctamente
 * sin mostrar caracteres corruptos en tildes y ñ.
 */

/**
 * Escapa un valor individual para el formato CSV.
 * Cubre null/undefined, valores numéricos y strings con caracteres especiales.
 */
function escapar(val: unknown): string {
  // null o undefined se convierten en celda vacía
  const str = val == null ? '' : String(val)

  // Si contiene caracteres que romperían el CSV, envolvemos en comillas
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Las comillas internas se duplican según RFC 4180
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Convierte un array de objetos planos a CSV y dispara la descarga del archivo.
 *
 * @param nombre - Nombre base del archivo, sin extensión ni fecha.
 *                 Ej: "personas" → genera "personas_2026-04-17.csv"
 * @param datos  - Array de objetos. Todos deben tener las mismas claves.
 *                 Las claves del primer objeto se usan como fila de encabezados.
 *
 * No hace nada si el array está vacío.
 */
export function exportarCsv(nombre: string, datos: object[]): void {
  // Sin filas no generamos archivo
  if (!datos.length) return

  // Las claves del primer objeto definen el orden y nombre de las columnas
  const cabeceras = Object.keys(datos[0])

  // Fila de encabezados (primera línea del CSV)
  const filaCabecera = cabeceras.join(',')

  // Convertimos cada objeto a una línea CSV
  const filaDatos = datos.map(fila =>
    cabeceras
      .map(clave => escapar((fila as Record<string, unknown>)[clave]))
      .join(',')
  )

  // Unimos todo con CRLF (estándar CSV)
  const contenido = [filaCabecera, ...filaDatos].join('\r\n')

  // Fecha de hoy en AAAA-MM-DD para incluir en el nombre del archivo
  const hoy = new Date().toISOString().slice(0, 10)
  const nombreArchivo = `${nombre}_${hoy}.csv`

  // BOM (byte order mark) + contenido — necesario para que Excel interprete UTF-8
  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' })

  // Creamos un <a> invisible, simulamos el clic y limpiamos la URL temporal
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}
