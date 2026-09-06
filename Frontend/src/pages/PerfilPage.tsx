/**
 * PerfilPage.tsx
 *
 * Página de perfil del usuario autenticado.
 * Muestra el email actual y permite cambiar la contraseña.
 *
 * El cambio de contraseña requiere:
 *   1. Contraseña actual (el backend la verifica con Supabase antes de cambiar)
 *   2. Nueva contraseña (mín 6 caracteres)
 *   3. Confirmación de la nueva contraseña (validada solo en frontend)
 *
 * Por qué pedir la contraseña actual:
 *   Si alguien roba la sesión de un usuario, no debería poder cambiar su contraseña
 *   sin conocer la contraseña anterior. Es una capa extra de seguridad.
 */

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { cambiarPassword } from '../api/auth.api'

export default function PerfilPage() {
  const { usuario } = useAuth()

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [passwordActual,   setPasswordActual]   = useState('')
  const [passwordNueva,    setPasswordNueva]    = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')

  // ── Estado de la operación ────────────────────────────────────────────────
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [exito,     setExito]     = useState(false)  // true tras guardar con éxito

  /**
   * Maneja el envío del formulario de cambio de contraseña.
   * Valida en el frontend antes de llamar al backend.
   */
  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setExito(false)

    // Validación de coincidencia de contraseñas en el cliente
    // (el backend también valida longitud mínima)
    if (passwordNueva !== passwordConfirmar) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }

    if (passwordNueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    setGuardando(true)

    try {
      await cambiarPassword(passwordActual, passwordNueva)
      setExito(true)
      // Limpiamos el formulario tras el éxito para no dejar contraseñas en campos
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmar('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar la contraseña'
      setError(msg)
    } finally {
      setGuardando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-2xl">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Mi perfil</h1>
        <p className="text-slate-500 text-sm mt-1">Información de tu cuenta de acceso al sistema</p>
      </div>

      {/* ── Tarjeta de información del usuario ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Cuenta
        </h2>

        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</p>
          {/* El email viene del contexto de autenticación — no es editable desde aquí */}
          <p className="text-base font-medium text-slate-800">
            {usuario?.email ?? '—'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Para cambiar tu email contacta al administrador del sistema
          </p>
        </div>
      </div>

      {/* ── Formulario de cambio de contraseña ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-5">
          Cambiar contraseña
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Contraseña actual */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="passwordActual" className="text-sm font-medium text-slate-700">
              Contraseña actual
            </label>
            <input
              id="passwordActual"
              type="password"
              value={passwordActual}
              onChange={e => setPasswordActual(e.target.value)}
              placeholder="Tu contraseña actual"
              required
              disabled={guardando}
              autoComplete="current-password"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                         placeholder:text-slate-400 text-slate-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          {/* Separador visual */}
          <hr className="border-slate-100" />

          {/* Nueva contraseña */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="passwordNueva" className="text-sm font-medium text-slate-700">
              Nueva contraseña
            </label>
            <input
              id="passwordNueva"
              type="password"
              value={passwordNueva}
              onChange={e => setPasswordNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={guardando}
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                         placeholder:text-slate-400 text-slate-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          {/* Confirmar nueva contraseña */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="passwordConfirmar" className="text-sm font-medium text-slate-700">
              Confirmar nueva contraseña
            </label>
            <input
              id="passwordConfirmar"
              type="password"
              value={passwordConfirmar}
              onChange={e => setPasswordConfirmar(e.target.value)}
              placeholder="Repite la nueva contraseña"
              required
              disabled={guardando}
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                         placeholder:text-slate-400 text-slate-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Mensaje de éxito — aparece tras guardar correctamente */}
          {exito && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <p className="text-sm text-emerald-700">
                Contraseña actualizada correctamente
              </p>
            </div>
          )}

          {/* Botón de submit */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={guardando || !passwordActual || !passwordNueva || !passwordConfirmar}
              className="px-5 py-2 text-sm font-medium text-white
                         bg-blue-600 hover:bg-blue-700 rounded-lg
                         transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>

        </form>
      </div>

    </div>
  )
}
