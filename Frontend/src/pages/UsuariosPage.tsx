/**
 * UsuariosPage.tsx
 *
 * Gestión de usuarios del sistema (cuentas de acceso en Supabase Auth).
 * Permite listar, crear y eliminar usuarios.
 *
 * Importante: estos son los usuarios de AUTENTICACIÓN del sistema,
 * no las personas del inventario (tabla personas).
 * Un usuario puede existir en Auth sin estar en la tabla personas.
 *
 * Operaciones disponibles:
 *   - Ver tabla con email, fecha de creación y último login
 *   - Crear usuario nuevo con email + contraseña (botón "Nuevo usuario")
 *   - Eliminar usuario (con confirmación, no permite auto-eliminación)
 */

import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { getUsuarios, crearUsuario, eliminarUsuario } from '../services/auth.service'
import type { UsuarioAdmin } from '../types/auth.types'
import Modal from '../components/Modal'
import ModalConfirmar from '../components/ModalConfirmar'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formatea una fecha ISO 8601 a fecha + hora legible en español.
 * Devuelve '—' si la fecha es null (ej: usuario que nunca inició sesión).
 */
function formatearFechaHora(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ── Sub-componentes del formulario ────────────────────────────────────────────
//
// IMPORTANTE: estos componentes están definidos en el nivel del MÓDULO,
// no dentro de otro componente. Si estuvieran dentro de ModalCrearUsuario
// (o peor, dentro de UsuariosPage), React los recrearía como un nuevo tipo
// de componente en cada render, desmontando y remontando los inputs y
// perdiendo el foco tras cada tecla pulsada.

/**
 * Campo de texto con label reutilizable para los formularios de usuario.
 */
function CampoUsuario({
  id, label, type, value, onChange, placeholder, autoComplete, deshabilitado,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  autoComplete?: string
  deshabilitado?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        disabled={deshabilitado}
        autoComplete={autoComplete}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                   placeholder:text-slate-400 text-slate-800
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  )
}

// ── Modal de creación de usuario ──────────────────────────────────────────────
//
// También debe estar en el nivel del módulo (fuera de UsuariosPage).
// Si estuviera dentro de UsuariosPage, sería redefinido en cada render
// del padre, causando el mismo problema de foco que el descrito arriba.

/**
 * Modal con formulario para crear un nuevo usuario.
 * Pide email y contraseña. El usuario queda confirmado inmediatamente.
 */
function ModalCrearUsuario({
  onClose,
  onCreado,
}: {
  onClose: () => void
  onCreado: (usuario: UsuarioAdmin) => void
}) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setGuardando(true)

    try {
      const nuevo = await crearUsuario(email.trim(), password)
      onCreado(nuevo)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el usuario'
      setError(msg)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Nuevo usuario" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <CampoUsuario
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="usuario@empresa.cl"
          autoComplete="off"
          deshabilitado={guardando}
        />

        <CampoUsuario
          id="password"
          label="Contraseña inicial"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          deshabilitado={guardando}
        />

        {/* Aviso: el usuario puede iniciar sesión inmediatamente */}
        <p className="text-xs text-slate-400">
          El usuario podrá iniciar sesión de inmediato. Sin verificación de email.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-slate-600
                       border border-slate-300 rounded-lg hover:bg-slate-50
                       transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || !email || !password}
            className="px-4 py-2 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 rounded-lg
                       transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {guardando ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>

      </form>
    </Modal>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { usuario: usuarioActual } = useAuth()

  const [usuarios,  setUsuarios]  = useState<UsuarioAdmin[]>([])
  const [cargando,  setCargando]  = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // Control de modales
  const [modalCrearAbierto,   setModalCrearAbierto]   = useState(false)
  const [usuarioParaEliminar, setUsuarioParaEliminar] = useState<UsuarioAdmin | null>(null)

  // Cargamos la lista al montar
  useEffect(() => {
    getUsuarios()
      .then(data => {
        setUsuarios(data)
        setCargando(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setCargando(false)
      })
  }, [])

  /**
   * Agrega el usuario recién creado al inicio de la lista y cierra el modal.
   */
  function handleCreado(nuevo: UsuarioAdmin) {
    setUsuarios(prev => [nuevo, ...prev])
    setModalCrearAbierto(false)
  }

  /**
   * Elimina el usuario seleccionado y lo quita de la lista local.
   * ModalConfirmar llama a esta función cuando el usuario confirma la acción.
   */
  async function handleEliminar() {
    if (!usuarioParaEliminar) return
    try {
      await eliminarUsuario(usuarioParaEliminar.id)
      setUsuarios(prev => prev.filter(u => u.id !== usuarioParaEliminar.id))
      setUsuarioParaEliminar(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar el usuario'
      setError(msg)
      setUsuarioParaEliminar(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm animate-pulse">Cargando usuarios...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuarios del sistema</h1>
          <p className="text-slate-500 text-sm mt-1">
            {usuarios.length} cuenta{usuarios.length !== 1 ? 's' : ''} de acceso registrada{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalCrearAbierto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                     text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>+</span>
          Nuevo usuario
        </button>
      </div>

      {/* Error global (ej: al eliminar) */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* ── Tabla ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Creado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Último acceso</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              usuarios.map(usuario => {
                // Marcamos al usuario actual para destacarlo y bloquear su eliminación
                const esMiUsuario = usuario.id === usuarioActual?.id

                return (
                  <tr
                    key={usuario.id}
                    className={`hover:bg-slate-50 transition-colors ${esMiUsuario ? 'bg-blue-50/40' : ''}`}
                  >

                    {/* Email — el usuario actual tiene una marca visual */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{usuario.email}</span>
                        {esMiUsuario && (
                          <span className="text-xs text-blue-600 font-medium bg-blue-100 px-1.5 py-0.5 rounded">
                            tú
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Fecha de creación */}
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {formatearFechaHora(usuario.created_at)}
                    </td>

                    {/* Último acceso — null si nunca ha iniciado sesión */}
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {formatearFechaHora(usuario.last_sign_in_at)}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {/* No permitimos eliminar al usuario actual —
                            el backend también lo rechaza, pero bloqueamos en el frontend
                            para dar mejor feedback. */}
                        {!esMiUsuario ? (
                          <button
                            onClick={() => setUsuarioParaEliminar(usuario)}
                            className="px-3 py-1 text-xs font-medium text-red-500
                                       hover:text-red-700 hover:bg-red-50
                                       rounded-md transition-colors"
                          >
                            Eliminar
                          </button>
                        ) : (
                          // Guión en lugar de botón deshabilitado — más limpio visualmente
                          <span className="text-xs text-slate-300 px-3 py-1">—</span>
                        )}
                      </div>
                    </td>

                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Aviso de seguridad ───────────────────────────────────────────── */}
      <p className="text-xs text-slate-400 mt-3">
        La eliminación de usuarios es permanente y no se puede deshacer.
        Para revocar acceso temporalmente, cambia la contraseña del usuario.
      </p>

      {/* ── Modales ─────────────────────────────────────────────────────── */}

      {modalCrearAbierto && (
        <ModalCrearUsuario
          onClose={() => setModalCrearAbierto(false)}
          onCreado={handleCreado}
        />
      )}

      {usuarioParaEliminar && (
        <ModalConfirmar
          titulo="Eliminar usuario"
          mensaje={`¿Estás seguro de que deseas eliminar la cuenta de "${usuarioParaEliminar.email}"? Esta acción es permanente y no se puede deshacer.`}
          labelConfirmar="Eliminar"
          onConfirmar={handleEliminar}
          onCancelar={() => setUsuarioParaEliminar(null)}
        />
      )}

    </div>
  )
}
