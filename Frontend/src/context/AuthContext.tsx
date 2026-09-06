/**
 * AuthContext.tsx
 *
 * Contexto de React que mantiene el estado de autenticación de la app.
 * Permite a cualquier componente saber si hay un usuario autenticado
 * y ejecutar login o logout sin prop-drilling.
 *
 * Por qué un contexto y no solo localStorage:
 *   Los componentes de React no se "suscriben" a cambios en localStorage.
 *   Si solo usáramos localStorage, hacer login no haría que el sidebar
 *   se actualice ni que ProtectedRoute deje pasar. El contexto dispara
 *   re-renders automáticos cuando cambia el estado de autenticación.
 *
 * Flujo al cargar la app:
 *   1. AuthProvider monta → isLoading = true
 *   2. Se lee localStorage — si hay token/usuario guardado, se restaura la sesión
 *   3. isLoading = false → la app renderiza normalmente
 *
 * Mientras isLoading es true, ProtectedRoute no redirige a /login
 * para evitar el "flash" de redirigir al usuario cuando en realidad
 * sí tenía sesión (solo tardaba un tick en restaurarla).
 */

import { createContext, useContext, useEffect, useState } from 'react'
import {
  login as loginService,
  logout as logoutService,
  getUsuarioGuardado,
} from '../api/auth.api'
import type { UsuarioAuth } from '../types/auth.types'

/**
 * Forma del valor que expone el contexto a los componentes hijos.
 */
interface AuthContextValue {
  usuario: UsuarioAuth | null  // null si no hay sesión activa
  isLoading: boolean           // true mientras se verifica el estado inicial
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// Creamos el contexto con undefined como valor inicial.
// undefined nos permite detectar si un componente intenta usar useAuth()
// fuera de un AuthProvider (lanzamos un error claro en ese caso).
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Proveedor que envuelve la app y mantiene el estado de autenticación.
 * Debe estar por encima de cualquier componente que use useAuth().
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // El usuario autenticado — null si no hay sesión
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null)

  // Mientras es true, la app no sabe aún si hay sesión o no
  // Empieza en true para que ProtectedRoute no flashee hacia /login
  const [isLoading, setIsLoading] = useState(true)

  // Al montar el provider, intentamos restaurar la sesión desde localStorage.
  // useEffect con [] se ejecuta una sola vez al iniciar la app.
  useEffect(() => {
    // getUsuarioGuardado() lee y parsea localStorage — es síncrono y rápido
    const usuarioGuardado = getUsuarioGuardado()

    if (usuarioGuardado) {
      // Había una sesión guardada — la restauramos sin llamar a la API
      setUsuario(usuarioGuardado)
    }

    // En cualquier caso (haya sesión o no), terminamos de cargar
    setIsLoading(false)
  }, [])

  /**
   * Llama al backend, guarda el token en localStorage y actualiza el estado.
   * Lanza un Error si las credenciales son incorrectas (lo captura LoginPage).
   */
  async function login(email: string, password: string): Promise<void> {
    // loginService guarda token + usuario en localStorage y devuelve los datos
    const datos = await loginService(email, password)

    // Actualizamos el estado del contexto para que React re-renderice
    // (esto hace que ProtectedRoute deje pasar y el sidebar muestre el usuario)
    setUsuario(datos.usuario)
  }

  /**
   * Cierra la sesión: limpia localStorage y resetea el estado a null.
   */
  async function logout(): Promise<void> {
    // logoutService notifica al servidor e invalida el token
    await logoutService()

    // Reseteamos el estado — React re-renderiza y ProtectedRoute redirige a /login
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook para acceder al contexto de autenticación desde cualquier componente.
 *
 * Uso:
 *   const { usuario, login, logout, isLoading } = useAuth()
 *
 * @throws Error si se usa fuera de un AuthProvider
 */
export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext)

  // Si es undefined, el componente está fuera del árbol del AuthProvider
  if (contexto === undefined) {
    throw new Error('useAuth() debe usarse dentro de un <AuthProvider>')
  }

  return contexto
}
