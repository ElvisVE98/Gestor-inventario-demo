/**
 * auth.middleware.ts
 *
 * Middleware de autenticación para las rutas protegidas de la API.
 * Se ejecuta antes del controller en cada ruta que lo registre.
 *
 * Flujo:
 *   1. Lee el header Authorization: Bearer <token>
 *   2. Verifica el token con Supabase (getUser comprueba la firma y expiración)
 *   3. Si es válido, adjunta el usuario al objeto request y llama a next()
 *   4. Si no es válido, responde con 401 sin llamar a next()
 *
 * Usamos getUser() y no solo JWT decode manual porque Supabase puede
 * revocar tokens (logout) y getUser() siempre consulta el estado real del servidor.
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabaseClient';

/**
 * Extiende el tipo Request de Express para poder adjuntar el usuario autenticado.
 * Esto evita usar `(req as any).usuario` en los controllers — el tipo es seguro.
 */
export interface RequestAutenticado extends Request {
  usuario?: {
    id: string;    // UUID del usuario en Supabase Auth
    email: string; // Email con el que inició sesión
  };
}

/**
 * Middleware que verifica el token JWT del header Authorization.
 * Las rutas que necesitan autenticación deben registrar este middleware antes de su handler.
 *
 * Uso en routes:
 *   router.get('/', verificarToken, miController)
 *
 * O aplicado a todo un router desde app.ts:
 *   app.use('/api/personas', verificarToken, personaRoutes)
 */
export async function verificarToken(
  req: RequestAutenticado,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Leemos el header Authorization completo, ej: "Bearer eyJhbGci..."
  const authHeader = req.headers.authorization;

  // Si no viene el header, el cliente no envió token — rechazamos inmediatamente
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { message: 'Token de autenticación no proporcionado. Incluye el header: Authorization: Bearer <token>' },
    });
    return;
  }

  // Extraemos solo el token, descartando el prefijo "Bearer "
  const token = authHeader.substring(7); // "Bearer " tiene 7 caracteres

  // Verificamos el token con Supabase.
  // getUser() valida la firma, la expiración y que el usuario siga activo.
  // Es una llamada a la red (no solo decode local), así que detecta tokens revocados.
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    // Token inválido, expirado o revocado
    res.status(401).json({
      success: false,
      error: { message: 'Token inválido o expirado. Inicia sesión nuevamente.' },
    });
    return;
  }

  // Token válido: adjuntamos los datos del usuario al request para que los
  // controllers puedan saber quién está haciendo la petición si lo necesitan
  req.usuario = {
    id: data.user.id,
    email: data.user.email ?? '',
  };

  // Pasamos al siguiente middleware o al controller
  next();
}
