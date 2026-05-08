/**
 * supabaseClient.ts
 *
 * Crea y exporta dos instancias del cliente Supabase para el backend:
 *
 *   supabase      → cliente con la anon key. Usado para operaciones normales
 *                   (consultas a tablas, auth de usuarios, etc.).
 *                   Con RLS desactivado en las tablas del proyecto, la anon key
 *                   tiene acceso completo igual que la service_role key.
 *
 *   supabaseAdmin → cliente con la service_role key. Requerido EXCLUSIVAMENTE
 *                   para operaciones de Supabase Auth admin:
 *                   admin.listUsers(), admin.createUser(), admin.deleteUser(),
 *                   admin.updateUserById(). Estas operaciones fallan con "User not
 *                   allowed" si el cliente no tiene la service_role key.
 *
 * Ambas keys están en el .env y NUNCA deben llegar al frontend.
 * La service_role key tiene acceso total al proyecto — tratarla como contraseña.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargamos las variables de entorno al inicio
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ── Variables de entorno ──────────────────────────────────────────────────────

const supabaseUrl      = process.env.SUPABASE_URL;
const supabaseAnonKey  = process.env.SUPABASE_SERVICE_KEY;       // anon key (nombre histórico)
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;  // service_role key (para admin)

// Validación temprana: si falta la URL o la anon key el sistema no puede funcionar
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY son obligatorias. ' +
    'Verifica tu archivo .env'
  );
}

// La service_role key es obligatoria para los endpoints de gestión de usuarios.
// Sin ella, las operaciones de admin fallan con "User not allowed".
if (!supabaseAdminKey) {
  throw new Error(
    'Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY. ' +
    'Se necesita para las operaciones de admin de Supabase Auth. ' +
    'Encuéntrala en: Supabase → Settings → API → service_role'
  );
}

// ── Cliente normal (anon key) ─────────────────────────────────────────────────

/**
 * Cliente Supabase para operaciones normales: consultas a tablas, login, logout, etc.
 * persistSession: false porque el backend no persiste sesiones de usuario.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// ── Cliente admin (service_role key) ─────────────────────────────────────────

/**
 * Cliente Supabase con la service_role key.
 * Solo para operaciones de Supabase Auth admin (listUsers, createUser, deleteUser, updateUserById).
 * No usar para consultas normales — la anon key es suficiente.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
  auth: {
    persistSession:     false,
    autoRefreshToken:   false,
    detectSessionInUrl: false,
  },
});
