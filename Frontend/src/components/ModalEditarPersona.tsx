/**
 * ModalEditarPersona.tsx
 *
 * Formulario modal para editar una persona existente.
 * Idéntico al de crear pero con los campos pre-rellenos y el RUT deshabilitado.
 * El RUT no se puede cambiar — el backend lo rechazaría y tiene sentido
 * porque es el identificador natural de la persona.
 */

import { useState } from 'react'
import type { ChangeEvent } from 'react'
import Modal from './Modal'
import { editarPersona } from '../services/persona.service'
import type { Persona, EditarPersonaDTO } from '../types/persona.types'

interface Props {
  persona: Persona                       // Persona a editar — precarga el formulario
  onClose: () => void
  onEditada: (persona: Persona) => void  // Notifica al padre con los datos actualizados
}

/**
 * Componente auxiliar para un campo del formulario.
 * Igual que en ModalCrearPersona — se repite para mantener cada archivo independiente.
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
 * Modal con formulario para editar una persona.
 * Se inicializa con los datos actuales de la persona.
 */
export default function ModalEditarPersona({ persona, onClose, onEditada }: Props) {
  // Inicializamos el formulario con los datos actuales de la persona
  // Omitimos rut, id, estado y created_at — no son editables
  const [form, setForm] = useState<EditarPersonaDTO>({
    nombre:       persona.nombre,
    correo:       persona.correo,
    cargo:        persona.cargo,
    sucursal:     persona.sucursal,
    centro_costo: persona.centro_costo,
  })

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Actualiza el campo correspondiente en el estado del formulario.
   */
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  /**
   * Envía solo los campos que cambiaron al backend.
   */
  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      const actualizada = await editarPersona(persona.id, form)
      onEditada(actualizada)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al editar la persona'
      setError(msg)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Editar: ${persona.nombre}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* RUT deshabilitado — solo se muestra como referencia, no se puede cambiar */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">RUT</label>
          <input
            value={persona.rut}
            disabled
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg
                       bg-slate-50 text-slate-400 cursor-not-allowed"
          />
          <p className="text-xs text-slate-400">El RUT no se puede modificar</p>
        </div>

        <Campo label="Nombre"          name="nombre"        value={form.nombre       ?? ''} onChange={handleChange} deshabilitado={guardando} />
        <Campo label="Correo"          name="correo"        type="email" value={form.correo ?? ''} onChange={handleChange} deshabilitado={guardando} />
        <Campo label="Cargo"           name="cargo"         value={form.cargo        ?? ''} onChange={handleChange} deshabilitado={guardando} />
        <Campo label="Sucursal"        name="sucursal"      value={form.sucursal     ?? ''} onChange={handleChange} deshabilitado={guardando} />
        <Campo label="Centro de costo" name="centro_costo"  value={form.centro_costo ?? ''} onChange={handleChange} deshabilitado={guardando} />

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
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 rounded-lg
                       transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

      </form>
    </Modal>
  )
}
