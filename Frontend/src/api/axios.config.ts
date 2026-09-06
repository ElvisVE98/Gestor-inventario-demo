/**
 * axios.config.ts
 *
 * Cliente HTTP centralizado con Axios para toda la aplicación Frontend.
 *
 * Responsabilidades:
 * 1. Configurar la URL base del Backend (baseURL) desde las variables de entorno.
 * 2. Interceptor de Request: Adjunta automáticamente el token JWT en el header 'Authorization: Bearer <token>'
 *    si el usuario tiene sesión activa, evitando tener que enviarlo manualmente en cada petición.
 * 3. Interceptor de Response: Desempaqueta directamente los datos útiles ('response.data.data' o 'response.data')
 *    y extrae mensajes de error claros del backend en caso de fallo (4xx o 5xx).
 */

import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'

// Clave del token en localStorage (evita dependencias circulares con auth.api)
const TOKEN_KEY = 'auth_token'

// Instancia única de Axios configurada para todo el proyecto
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Timeout de 15 segundos para evitar peticiones colgadas
})

/**
 * Interceptor de Peticiones (Request Interceptor):
 * Se ejecuta automáticamente ANTES de que cada petición HTTP salga al servidor.
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
    // Si hay un token guardado en localStorage, lo inyectamos en la cabecera
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: unknown) => {
    return Promise.reject(error)
  }
)

/**
 * Interceptor de Respuestas (Response Interceptor):
 * Se ejecuta automáticamente cuando el servidor responde.
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Si la respuesta del backend sigue el estándar { success: true, data: [...] },
    // devolvemos directamente el campo data para que los componentes reciban la información limpia.
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      return response.data.data
    }
    return response.data
  },
  (error: any) => {
    // Extraemos el mensaje de error que envió el Backend (si existe) o un mensaje descriptivo
    const mensajeError =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Error en la comunicación con el servidor'

    // Retornamos una promesa rechazada con el mensaje limpio para que el catch del componente lo muestre
    return Promise.reject(new Error(mensajeError))
  }
)

export default api
