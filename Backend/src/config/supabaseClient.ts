/**
 * config/supabaseClient.ts
 *
 * Configuración e inicialización de las instancias del cliente Supabase para el backend:
 *
 *   supabase      → cliente con la anon key. Usado para operaciones normales
 *                   (consultas a tablas de personas, activos, asignaciones, historial).
 *
 *   supabaseAdmin → cliente con la service_role key. Requerido EXCLUSIVAMENTE
 *                   para operaciones de administración de Supabase Auth:
 *                   admin.listUsers(), admin.createUser(), admin.deleteUser(),
 *                   admin.updateUserById().
 *
 * Ambas claves provienen del archivo .env y nunca deben exponerse al frontend.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargamos las variables de entorno si no fueron cargadas previamente
dotenv.config();

// Requerido en este entorno local/corporativo para evitar el error 'SELF_SIGNED_CERT_IN_CHAIN'
// al conectar con los servidores HTTPS de Supabase a través de proxy o antivirus local
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ── Variables de entorno ──────────────────────────────────────────────────────

const supabaseUrl      = process.env.SUPABASE_URL;
const supabaseAnonKey  = process.env.SUPABASE_SERVICE_KEY;       // anon key
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;  // service_role key

// Validación temprana: si falta la URL o la anon key el backend no puede operar
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY son obligatorias. ' +
    'Verifica tu archivo .env'
  );
}

// La service_role key es obligatoria para administrar usuarios de Supabase Auth
if (!supabaseAdminKey) {
  throw new Error(
    'Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY. ' +
    'Se necesita para las operaciones de admin de Supabase Auth. ' +
    'Encuéntrala en: Supabase → Settings → API → service_role'
  );
}

// ── Cliente normal (anon key) ─────────────────────────────────────────────────

/**
 * Cliente Supabase para operaciones normales de base de datos.
 * persistSession: false porque una API REST en backend es stateless.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// ── Cliente admin (service_role key) ─────────────────────────────────────────

/**
 * Cliente Supabase con la service_role key.
 * Solo para operaciones de Supabase Auth admin (gestión de cuentas de usuario).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
  auth: {
    persistSession:     false,
    autoRefreshToken:   false,
    detectSessionInUrl: false,
  },
});
