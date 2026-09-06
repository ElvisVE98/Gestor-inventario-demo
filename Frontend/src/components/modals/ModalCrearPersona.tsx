/**
 * ModalCrearPersona.tsx
 *
 * Formulario modal para crear una persona nueva.
 * Todos los campos son obligatorios.
 * Al guardar con éxito llama a onCreada(persona) para que la página
 * pueda actualizar su lista sin recargar desde la API.
 */

import { useState } from 'react'
import type { ChangeEvent } from 'react'
import Modal from './Modal'
import { crearPersona } from '../../api/persona.api'
import type { Persona, CrearPersonaDTO } from '../../types/persona.types'

interface Props {
  onClose: () => void                  // Cierra el modal (X o Cancelar)
  onCreada: (persona: Persona) => void // Notifica a la página con la persona creada
}

/**
 * Componente auxiliar para un campo del formulario.
 * Reduce la repetición de label + input en 6 campos iguales.
 */
function Campo({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  deshabilitado,
}: {
  label: string
  name: string
  type?: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  deshabilitado?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        disabled={deshabilitado}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                   placeholder:text-slate-400 text-slate-800
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  )
}

/**
 * Modal con formulario para crear una persona nueva.
 */
export default function ModalCrearPersona({ onClose, onCreada }: Props) {
  // Estado del formulario — un objeto para todos los campos
  const [form, setForm] = useState<CrearPersonaDTO>({
    rut: '',
    nombre: '',
    correo: '',
    cargo: '',
    sucursal: '',
    centro_costo: '',
  })

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Actualiza el campo correspondiente cuando el usuario escribe.
   * Usamos el atributo `name` del input para saber qué campo actualizar.
   */
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  /**
   * Envía el formulario al backend y notifica al padre si tiene éxito.
   */
  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      const nueva = await crearPersona(form)
      // Notificamos al padre con la persona creada para que actualice la lista
      onCreada(nueva)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la persona'
      setError(msg)
      setGuardando(false)
    }
    // No reseteamos guardando=false en éxito porque el padre desmonta el modal
  }

  return (
    <Modal titulo="Nueva persona" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <Campo label="RUT"            name="rut"           value={form.rut}           onChange={handleChange} placeholder="12.345.678-9" deshabilitado={guardando} />
        <Campo label="Nombre"         name="nombre"        value={form.nombre}        onChange={handleChange} placeholder="Juan Pérez"   deshabilitado={guardando} />
        <Campo label="Correo"         name="correo"        type="email" value={form.correo}  onChange={handleChange} placeholder="juan@empresa.cl" deshabilitado={guardando} />
        <Campo label="Cargo"          name="cargo"         value={form.cargo}         onChange={handleChange} placeholder="Desarrollador" deshabilitado={guardando} />
        <Campo label="Sucursal"       name="sucursal"      value={form.sucursal}      onChange={handleChange} placeholder="Santiago"      deshabilitado={guardando} />
        <Campo label="Centro de costo" name="centro_costo" value={form.centro_costo} onChange={handleChange} placeholder="TI-001"        deshabilitado={guardando} />

        {/* Error del backend */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Acciones del formulario */}
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
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 rounded-lg
                       transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {guardando ? 'Guardando...' : 'Crear persona'}
          </button>
        </div>

      </form>
    </Modal>
  )
}
