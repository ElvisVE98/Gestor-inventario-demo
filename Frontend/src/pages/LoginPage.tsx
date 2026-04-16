/**
 * LoginPage.tsx
 *
 * Pantalla de inicio de sesión.
 * Es la única página pública — todas las demás requieren autenticación.
 *
 * Tiene dos modos:
 *   'login'      → Formulario de email + password (modo por defecto)
 *   'recuperar'  → Mini-formulario para enviar email de recuperación de contraseña
 *
 * Al hacer login exitoso redirige al dashboard.
 * Si ya hay sesión activa, redirige al dashboard directamente.
 */

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { recuperarPassword } from '../services/auth.service'

/**
 * Modo de la pantalla: formulario de login o formulario de recuperación.
 */
type Modo = 'login' | 'recuperar'

export default function LoginPage() {
  const { usuario, isLoading, login } = useAuth()
  const navigate = useNavigate()

  // Modo actual de la pantalla
  const [modo, setModo] = useState<Modo>('login')

  // ── Estado del formulario de login ────────────────────────────────────────
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // ── Estado del formulario de recuperación ─────────────────────────────────
  const [emailRecuperar,   setEmailRecuperar]   = useState('')
  const [enviandoRecuperar, setEnviandoRecuperar] = useState(false)
  const [errorRecuperar,   setErrorRecuperar]   = useState<string | null>(null)
  // Cuando es true, mostramos el mensaje "Revisa tu correo" en vez del formulario
  const [recuperacionEnviada, setRecuperacionEnviada] = useState(false)

  // Si ya hay sesión activa, redirigimos al dashboard
  if (!isLoading && usuario) {
    return <Navigate to="/" replace />
  }

  /**
   * Maneja el envío del formulario de login.
   */
  async function handleLogin(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  /**
   * Maneja el envío del formulario de recuperación de contraseña.
   * Siempre muestra el mensaje de éxito, incluso si el email no existe
   * (el backend no revela si el email está registrado por seguridad).
   */
  async function handleRecuperar(e: { preventDefault(): void }) {
    e.preventDefault()
    setErrorRecuperar(null)
    setEnviandoRecuperar(true)

    try {
      await recuperarPassword(emailRecuperar.trim())
      setRecuperacionEnviada(true)
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al enviar el email'
      setErrorRecuperar(mensaje)
    } finally {
      setEnviandoRecuperar(false)
    }
  }

  /**
   * Vuelve al modo login limpiando el estado del modo recuperar.
   */
  function volverAlLogin() {
    setModo('login')
    setEmailRecuperar('')
    setErrorRecuperar(null)
    setRecuperacionEnviada(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center px-4">

      <div className="w-full max-w-sm">

        {/* ── Logo / nombre del sistema — sobre la card ─────────────────── */}
        <div className="text-center mb-6">
          <p className="text-3xl font-bold text-white tracking-tight">Curifor</p>
          <p className="text-sm text-blue-300 mt-1">Gestión de inventario TI</p>
        </div>

      <div className="bg-white rounded-xl shadow-lg w-full p-8">

        {/* ── Encabezado de la card — cambia según el modo ──────────────── */}
        <div className="mb-7 text-center">
          <h1 className="text-xl font-bold text-slate-800">
            {modo === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {modo === 'login'
              ? 'Ingresa con tu cuenta corporativa'
              : 'Te enviaremos un enlace a tu correo'}
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            MODO: LOGIN
        ════════════════════════════════════════════════════════════════ */}
        {modo === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@empresa.cl"
                required
                autoComplete="email"
                disabled={enviando}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                           placeholder:text-slate-400 text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={enviando}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                           placeholder:text-slate-400 text-slate-800
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                         text-white text-sm font-semibold py-2.5 rounded-lg
                         transition-colors
                         disabled:bg-blue-400 disabled:cursor-not-allowed
                         mt-1"
            >
              {enviando ? 'Ingresando...' : 'Ingresar'}
            </button>

            {/* Link para ir al modo recuperar contraseña */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setModo('recuperar')}
                disabled={enviando}
                className="text-xs text-slate-400 hover:text-blue-600 transition-colors
                           disabled:opacity-50"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

          </form>
        )}

        {/* ════════════════════════════════════════════════════════════════
            MODO: RECUPERAR CONTRASEÑA
        ════════════════════════════════════════════════════════════════ */}
        {modo === 'recuperar' && (
          <div>
            {/* Estado: email enviado → mostramos confirmación */}
            {recuperacionEnviada ? (
              <div className="flex flex-col gap-5">

                {/* Icono y mensaje de éxito */}
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">📬</div>
                  <p className="text-sm font-medium text-slate-700">Revisa tu correo</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Si el email <strong>{emailRecuperar}</strong> está registrado en el sistema,
                    recibirás un enlace para restablecer tu contraseña.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Revisa también la carpeta de spam.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={volverAlLogin}
                  className="w-full px-4 py-2.5 text-sm font-medium
                             text-slate-600 border border-slate-300 rounded-lg
                             hover:bg-slate-50 transition-colors"
                >
                  Volver al inicio de sesión
                </button>

              </div>
            ) : (
              /* Estado: formulario de recuperación */
              <form onSubmit={handleRecuperar} className="flex flex-col gap-4">

                <p className="text-sm text-slate-500">
                  Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="emailRecuperar" className="text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="emailRecuperar"
                    type="email"
                    value={emailRecuperar}
                    onChange={e => setEmailRecuperar(e.target.value)}
                    placeholder="usuario@empresa.cl"
                    required
                    autoComplete="email"
                    disabled={enviandoRecuperar}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                               placeholder:text-slate-400 text-slate-800
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                {errorRecuperar && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-sm text-red-600">{errorRecuperar}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviandoRecuperar || !emailRecuperar}
                  className="w-full bg-blue-600 hover:bg-blue-700
                             text-white text-sm font-semibold py-2.5 rounded-lg
                             transition-colors
                             disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {enviandoRecuperar ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>

                {/* Volver al login */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={volverAlLogin}
                    disabled={enviandoRecuperar}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors
                               disabled:opacity-50"
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>

              </form>
            )}
          </div>
        )}

      </div>
      </div>
    </div>
  )
}
