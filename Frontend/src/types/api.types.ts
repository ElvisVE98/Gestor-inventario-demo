/**
 * api.types.ts
 *
 * Tipos genéricos que describen el formato estándar de respuesta de la API.
 * Todos los endpoints del backend devuelven esta misma estructura,
 * así que centralizarla aquí evita repetirla en cada service del frontend.
 */

/**
 * Respuesta exitosa de la API.
 * El genérico T representa el tipo del campo `data` (varía por endpoint).
 *
 * Ejemplo: ApiResponse<DashboardKPIs>, ApiResponse<Persona[]>
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  total?: number;    // Solo presente en endpoints que devuelven listas
  message?: string;  // Solo presente en POST/PUT/DELETE
}

/**
 * Respuesta de error de la API.
 * Siempre tiene success: false y un objeto error con el mensaje.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
  };
}
