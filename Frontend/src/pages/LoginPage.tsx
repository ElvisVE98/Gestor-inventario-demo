/**
 * LoginPage.tsx
 *
 * Pantalla de inicio de sesión con diseño glassmorphism.
 * Es la única página pública — todas las demás requieren autenticación.
 *
 * Modos:
 *   'login'     → email + password con ojo para mostrar/ocultar
 *   'recuperar' → mini-formulario de recuperación de contraseña
 *
 * Al hacer login exitoso redirige al dashboard.
 * Si ya hay sesión activa, redirige al dashboard directamente.
 */

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { recuperarPassword } from '../services/auth.service'

/** Modo de la pantalla: formulario de login o formulario de recuperación. */
type Modo = 'login' | 'recuperar'

/**
 * Clases Tailwind compartidas para todos los inputs con efecto glass.
 * Se aplican a email y password para mantener consistencia visual.
 */
const CLS_INPUT =
  'w-full bg-white/[7%] border border-white/[18%] rounded-[10px] ' +
  'text-slate-100 px-3.5 py-2.5 text-sm placeholder:text-slate-500 ' +
  'focus:outline-none focus:border-blue-400/60 transition-colors disabled:opacity-50'

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

  // Controla si la contraseña se muestra en texto plano
  const [mostrarPassword, setMostrarPassword] = useState(false)

  // ── Estado del formulario de recuperación ─────────────────────────────────
  const [emailRecuperar,    setEmailRecuperar]    = useState('')
  const [enviandoRecuperar, setEnviandoRecuperar] = useState(false)
  const [errorRecuperar,    setErrorRecuperar]    = useState<string | null>(null)
  // Cuando es true mostramos el mensaje de confirmación en vez del formulario
  const [recuperacionEnviada, setRecuperacionEnviada] = useState(false)

  // Si ya hay sesión activa, redirigimos al dashboard
  if (!isLoading && usuario) {
    return <Navigate to="/" replace />
  }

  /** Maneja el envío del formulario de login. */
  async function handleLogin(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setEnviando(false)
    }
  }

  /**
   * Maneja el envío del formulario de recuperación de contraseña.
   * Siempre muestra éxito — el backend no revela si el email existe (seguridad).
   */
  async function handleRecuperar(e: { preventDefault(): void }) {
    e.preventDefault()
    setErrorRecuperar(null)
    setEnviandoRecuperar(true)
    try {
      await recuperarPassword(emailRecuperar.trim())
      setRecuperacionEnviada(true)
    } catch (err: unknown) {
      setErrorRecuperar(err instanceof Error ? err.message : 'Error al enviar el email')
    } finally {
      setEnviandoRecuperar(false)
    }
  }

  /** Vuelve al modo login limpiando el estado del formulario de recuperación. */
  function volverAlLogin() {
    setModo('login')
    setEmailRecuperar('')
    setErrorRecuperar(null)
    setRecuperacionEnviada(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /* Fondo: degradado oscuro slate→blue con overflow hidden para contener los blobs */
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-[#0c0c20] to-[#37043d]
                    flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Blobs decorativos — puramente visuales, no interactivos ──────────── */}

      {/* Blob 1 — gran círculo azul, arriba-izquierda */}
      <div aria-hidden="true"
           className="absolute -top-20 -left-24 w-[420px] h-[420px]
                      rounded-full bg-blue-600/25 blur-[80px]
                      pointer-events-none animate-blob-slow" />

      {/* Blob 2 — gran círculo índigo, abajo-derecha */}
      <div aria-hidden="true"
           className="absolute -bottom-24 -right-20 w-[480px] h-[480px]
                      rounded-full bg-indigo-500/20 blur-[90px]
                      pointer-events-none animate-blob-medium" />

      {/* Blob 3 — mediano azul claro, arriba-derecha */}
      <div aria-hidden="true"
           className="absolute top-10 right-14 w-[260px] h-[260px]
                      rounded-full bg-blue-400/15 blur-[60px]
                      pointer-events-none animate-blob-fast" />

      {/* Blob 4 — mediano violeta, abajo-izquierda */}
      <div aria-hidden="true"
           className="absolute bottom-14 left-10 w-[300px] h-[300px]
                      rounded-full bg-violet-500/15 blur-[70px]
                      pointer-events-none animate-blob-xslow" />

      {/* ── Card principal con efecto glassmorphism ───────────────────────────── */}
      {/* [-webkit-backdrop-filter] para compatibilidad con Safari */}
      <div className="w-full max-w-[420px] relative z-10
                      bg-white/[8%] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)]
                      border border-white/15 rounded-[20px] px-9 py-10">

        {/* ── Encabezado — nombre del sistema y subtítulo ───────────────────── */}
        <div className="text-center mb-8">
          <p className="text-[28px] font-bold text-white tracking-tight">Curifor</p>
          <p className="text-[13px] text-slate-400 mt-1.5">Gestión de Inventario TI</p>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            MODO: LOGIN
        ════════════════════════════════════════════════════════════════════ */}
        {modo === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-[18px]">

            {/* Campo email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[13px] font-medium text-slate-300">
                Correo electrónico
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
                className={CLS_INPUT}
              />
            </div>

            {/* Campo contraseña con botón ojo para mostrar/ocultar */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[13px] font-medium text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={enviando}
                  className={`${CLS_INPUT} pr-10`}
                />
                {/* Botón ojo — alterna visibilidad de la contraseña */}
                <button
                  type="button"
                  onClick={() => setMostrarPassword(v => !v)}
                  disabled={enviando}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-slate-500 hover:text-slate-300 transition-colors
                             cursor-pointer p-0.5 bg-transparent border-0 disabled:opacity-50
                             flex items-center"
                >
                  {mostrarPassword ? (
                    /* Ojo tachado — contraseña visible actualmente */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    /* Ojo abierto — contraseña enmascarada actualmente */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mensaje de error de login */}
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 rounded-[10px] px-3.5 py-2.5">
                <p className="text-[13px] text-red-300">{error}</p>
              </div>
            )}

            {/* Botón Ingresar */}
            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                         disabled:bg-blue-600/40 disabled:cursor-not-allowed
                         text-white font-semibold text-sm py-[11px]
                         rounded-[10px] transition-colors cursor-pointer mt-0.5"
            >
              {enviando ? 'Ingresando...' : 'Ingresar'}
            </button>

            {/* Link ¿Olvidaste tu contraseña? */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setModo('recuperar')}
                disabled={enviando}
                className="text-xs text-slate-500 hover:text-blue-300 transition-colors
                           cursor-pointer disabled:opacity-50 bg-transparent border-0"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

          </form>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            MODO: RECUPERAR CONTRASEÑA
        ════════════════════════════════════════════════════════════════════ */}
        {modo === 'recuperar' && (
          <div>

            {/* Estado: email ya enviado → pantalla de confirmación */}
            {recuperacionEnviada ? (
              <div className="flex flex-col gap-5">

                <div className="text-center py-3">
                  <div className="text-4xl mb-3">📬</div>
                  <p className="text-sm font-semibold text-slate-100 mb-2">Revisa tu correo</p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-1">
                    Si el email <strong className="text-slate-300">{emailRecuperar}</strong> está
                    registrado en el sistema, recibirás un enlace para restablecer tu contraseña.
                  </p>
                  <p className="text-xs text-slate-500">Revisa también la carpeta de spam.</p>
                </div>

                {/* Botón volver — estilo ghost glass */}
                <button
                  type="button"
                  onClick={volverAlLogin}
                  className="w-full bg-white/[6%] hover:bg-white/[11%]
                             border border-white/15 rounded-[10px]
                             text-slate-300 text-[13px] font-medium py-2.5
                             transition-colors cursor-pointer"
                >
                  Volver al inicio de sesión
                </button>

              </div>
            ) : (
              /* Estado: formulario de recuperación */
              <form onSubmit={handleRecuperar} className="flex flex-col gap-[18px]">

                <p className="text-[13px] text-slate-400 leading-relaxed">
                  Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                {/* Campo email de recuperación */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="emailRecuperar" className="text-[13px] font-medium text-slate-300">
                    Correo electrónico
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
                    className={CLS_INPUT}
                  />
                </div>

                {/* Mensaje de error de recuperación */}
                {errorRecuperar && (
                  <div className="bg-red-500/15 border border-red-500/30 rounded-[10px] px-3.5 py-2.5">
                    <p className="text-[13px] text-red-300">{errorRecuperar}</p>
                  </div>
                )}

                {/* Botón enviar enlace */}
                <button
                  type="submit"
                  disabled={enviandoRecuperar || !emailRecuperar}
                  className="w-full bg-blue-600 hover:bg-blue-700
                             disabled:bg-blue-600/40 disabled:cursor-not-allowed
                             text-white font-semibold text-sm py-[11px]
                             rounded-[10px] transition-colors cursor-pointer"
                >
                  {enviandoRecuperar ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>

                {/* Volver al login */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={volverAlLogin}
                    disabled={enviandoRecuperar}
                    className="text-xs text-slate-500 hover:text-blue-300 transition-colors
                               cursor-pointer disabled:opacity-50 bg-transparent border-0"
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
  )
}
