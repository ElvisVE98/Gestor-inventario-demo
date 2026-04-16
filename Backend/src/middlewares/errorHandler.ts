/**
 * errorHandler.ts
 *
 * Middleware global de manejo de errores para Express.
 * Centraliza el formato de las respuestas de error para que el frontend
 * siempre reciba la misma estructura, independientemente de dónde ocurrió el error.
 *
 * Se registra ÚLTIMO en app.ts (después de todas las rutas) porque Express
 * solo lo invoca cuando se llama `next(error)` desde una ruta o middleware anterior.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Estructura de error personalizada que usamos internamente.
 * Extendemos Error para poder agregar un statusCode HTTP.
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    // Necesario cuando se extiende una clase nativa en TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Middleware de manejo de errores.
 * Express lo reconoce como error handler porque recibe 4 argumentos (err, req, res, next).
 * Transforma cualquier error en una respuesta JSON estructurada.
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // next es requerido por la firma de Express aunque no lo usemos
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Si es un AppError nuestro, usamos su statusCode; si no, asumimos 500 (error interno)
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Error interno del servidor';

  // En desarrollo mostramos el stack trace para facilitar el debug
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      // Solo incluimos el stack en desarrollo
      ...(isDev && { stack: err.stack }),
    },
  });
}

/**
 * Helper para lanzar un error 404.
 * Uso: throw notFound('Persona no encontrada')
 */
export function notFound(message: string): AppError {
  return new AppError(message, 404);
}

/**
 * Helper para lanzar un error 400 (solicitud inválida / validación).
 * Uso: throw badRequest('El campo correo es obligatorio')
 */
export function badRequest(message: string): AppError {
  return new AppError(message, 400);
}

/**
 * Helper para lanzar un error 409 (conflicto, ej: RUT duplicado).
 * Uso: throw conflict('Ya existe una persona con ese RUT')
 */
export function conflict(message: string): AppError {
  return new AppError(message, 409);
}
