/**
 * api.ts
 *
 * Helper centralizado para hacer peticiones al backend con autenticación.
 * Todos los services del frontend deben usar fetchConAuth en vez de fetch() directo.
 *
 * Por qué existe este archivo:
 *   Sin él, cada service tendría que repetir la lógica de leer el token,
 *   construir el header Authorization y parsear la respuesta estándar.
 *   Centralizarlo aquí significa que si el día de mañana cambia cómo manejamos
 *   el token (ej: pasar de localStorage a cookies), solo hay que cambiar este archivo.
 */

import { getToken } from './auth.service'

/**
 * Realiza un fetch al backend incluyendo automáticamente el token JWT en el header.
 * Parsea la respuesta y devuelve directamente el campo `data` si tiene éxito.
 * Lanza un Error con el mensaje del backend si la respuesta es un error.
 *
 * @param url     - URL completa del endpoint
 * @param opciones - Opciones del fetch (method, body, etc.) — headers se fusionan
 * @returns El campo `data` de la respuesta del backend, tipado como T
 * @throws Error con el mensaje del backend o un mensaje genérico
 */
export async function fetchConAuth<T>(url: string, opciones: RequestInit = {}): Promise<T> {
  // Leemos el token desde localStorage — puede ser null si no hay sesión
  const token = getToken()

  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      // Content-Type por defecto para todos los requests
      'Content-Type': 'application/json',
      // Solo incluimos el header Authorization si hay token disponible
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Las opciones del caller pueden sobreescribir headers si lo necesitan
      ...(opciones.headers ?? {}),
    },
  })

  // Leemos el JSON siempre — tanto para éxito como para error
  const json = await respuesta.json()

  // Si el servidor respondió con error, lanzamos con el mensaje del backend
  if (!respuesta.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Error en la petición al servidor')
  }

  // Devolvemos solo el campo data, ya tipado — los services no necesitan parsear nada
  return json.data as T
}
