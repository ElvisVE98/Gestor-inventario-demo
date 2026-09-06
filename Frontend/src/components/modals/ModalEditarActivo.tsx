/**
 * ModalEditarActivo.tsx
 *
 * Formulario modal para editar un activo existente.
 * Idéntico al de crear pero:
 *   - Se inicializa con los valores actuales del activo
 *   - La categoría está deshabilitada (no se puede cambiar según la API)
 *   - Llama a editarActivo() en vez de crearActivo()
 *
 * Solo envía los campos que el usuario realmente modificó (todos opcionales
 * en EditarActivoDTO), por eso la lógica de prepararDatos es la misma.
 */

import { useState } from 'react'
import type { ChangeEvent } from 'react'
import Modal from './Modal'
import { editarActivo } from '../../api/activo.api'
import type { Activo, EditarActivoDTO } from '../../types/activo.types'

interface Props {
  activo: Activo
  onClose: () => void
  onEditado: (activo: Activo) => void
}

// ── Componentes auxiliares (igual que en ModalCrearActivo) ────────────────────

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
      <label htmlFor={name} className="text-sm font-medium text-slate-700">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={deshabilitado}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                   placeholder:text-slate-400 text-slate-800
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  )
}

function CampoSelect({
  label,
  name,
  value,
  onChange,
  children,
  deshabilitado,
}: {
  label: string
  name: string
  value: string
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
  deshabilitado?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">{label}</label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={deshabilitado}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                   text-slate-800 bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-slate-50 disabled:text-slate-400"
      >
        {children}
      </select>
    </div>
  )
}

function CampoCheck({
  label,
  name,
  checked,
  onChange,
  deshabilitado,
}: {
  label: string
  name: string
  checked: boolean
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  deshabilitado?: boolean
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={deshabilitado}
        className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

function SeccionTitulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest pt-2">
      {children}
    </p>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convierte null | number | boolean a string para los inputs controlados */
const s = (val: string | number | boolean | null | undefined): string =>
  val == null ? '' : String(val)

/** Descarta strings vacíos; convierte número string a number */
const str = (val: string): string | undefined => val.trim() || undefined
const num = (val: string): number | undefined => val.trim() ? Number(val) : undefined

// ── Tipo del estado local del formulario ──────────────────────────────────────

type FormEditar = {
  nombre_equipo: string
  estado: string
  teamviewer: string
  anydesk: string
  mac: string
  mac_wifi: string
  sistema_operativo: string
  arquitectura: string
  procesador: string
  generacion_procesador: string
  anio_procesador: string
  ram: string
  disco: string
  imei: string
  marca: string
  modelo: string
  anio_lanzamiento: string
  alza_notebook: boolean
  monitor_extra: boolean
  mochila: boolean
  auriculares: boolean
  tipo_suite: string
  tipo_licencia: string
  tipo_documento: string
  numero_factura: string
  costo: string
  fecha_compra: string
  fecha_entrega: string
  acta_entrega_url: string
  especificaciones: string
}

function activoAForm(a: Activo): FormEditar {
  return {
    nombre_equipo:        s(a.nombre_equipo),
    estado:               s(a.estado),
    teamviewer:           s(a.teamviewer),
    anydesk:              s(a.anydesk),
    mac:                  s(a.mac),
    mac_wifi:             s(a.mac_wifi),
    sistema_operativo:    s(a.sistema_operativo),
    arquitectura:         s(a.arquitectura),
    procesador:           s(a.procesador),
    generacion_procesador: s(a.generacion_procesador),
    anio_procesador:      s(a.anio_procesador),
    ram:                  s(a.ram),
    disco:                s(a.disco),
    imei:                 s(a.imei),
    marca:                s(a.marca),
    modelo:               s(a.modelo),
    anio_lanzamiento:     s(a.anio_lanzamiento),
    alza_notebook:        a.alza_notebook ?? false,
    monitor_extra:        a.monitor_extra  ?? false,
    mochila:              a.mochila        ?? false,
    auriculares:          a.auriculares    ?? false,
    tipo_suite:           s(a.tipo_suite),
    tipo_licencia:        s(a.tipo_licencia),
    tipo_documento:       s(a.tipo_documento),
    numero_factura:       s(a.numero_factura),
    costo:                s(a.costo),
    fecha_compra:         s(a.fecha_compra),
    fecha_entrega:        s(a.fecha_entrega),
    acta_entrega_url:     s(a.acta_entrega_url),
    especificaciones:     s(a.especificaciones),
  }
}

function prepararDatos(form: FormEditar, categoria: string): EditarActivoDTO {
  const dto: EditarActivoDTO = {}

  dto.nombre_equipo = str(form.nombre_equipo)
  dto.estado = str(form.estado) as EditarActivoDTO['estado']

  if (categoria === 'equipo') {
    dto.teamviewer = str(form.teamviewer)
    dto.anydesk    = str(form.anydesk)
    dto.mac        = str(form.mac)
    dto.mac_wifi   = str(form.mac_wifi)
  }

  if (categoria === 'equipo' || categoria === 'tablet') {
    dto.sistema_operativo     = str(form.sistema_operativo)
    dto.arquitectura          = str(form.arquitectura)
    dto.procesador            = str(form.procesador)
    dto.generacion_procesador = str(form.generacion_procesador)
    dto.anio_procesador       = num(form.anio_procesador)
    dto.ram                   = str(form.ram)
    dto.disco                 = str(form.disco)
  }

  if (categoria === 'celular' || categoria === 'tablet') {
    dto.imei = str(form.imei)
  }

  if (categoria !== 'licencia') {
    dto.marca            = str(form.marca)
    dto.modelo           = str(form.modelo)
    dto.anio_lanzamiento = num(form.anio_lanzamiento)
  }

  if (categoria === 'celular') {
    dto.sistema_operativo = str(form.sistema_operativo)
  }

  if (categoria === 'equipo') {
    dto.alza_notebook = form.alza_notebook
    dto.monitor_extra = form.monitor_extra
    dto.mochila       = form.mochila
    dto.auriculares   = form.auriculares
  }

  if (categoria === 'licencia') {
    dto.tipo_suite    = str(form.tipo_suite)
    dto.tipo_licencia = str(form.tipo_licencia)
  }

  // Sección compra — solo aplica a equipos físicos, no a licencias.
  // Las licencias no tienen factura, costo de hardware ni acta de entrega física.
  if (categoria !== 'licencia') {
    dto.tipo_documento   = str(form.tipo_documento)
    dto.numero_factura   = str(form.numero_factura)
    dto.costo            = num(form.costo)
    dto.fecha_compra     = str(form.fecha_compra)
    dto.fecha_entrega    = str(form.fecha_entrega)
    dto.acta_entrega_url = str(form.acta_entrega_url)
  }

  // Observaciones aplica a todas las categorías
  dto.especificaciones = str(form.especificaciones)

  return dto
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ModalEditarActivo({ activo, onClose, onEditado }: Props) {
  const [form, setForm]           = useState<FormEditar>(() => activoAForm(activo))
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const cat = activo.categoria

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleCheck(e: ChangeEvent<HTMLInputElement>) {
    const { name, checked } = e.target
    setForm(prev => ({ ...prev, [name]: checked }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      const datos = prepararDatos(form, cat)
      const editado = await editarActivo(activo.id, datos)
      onEditado(editado)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al editar el activo'
      setError(msg)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Editar ${activo.nombre_equipo}`} onClose={onClose} ancho="lg" scrollable>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* ── Datos base ─────────────────────────────────────────────────── */}
        <SeccionTitulo>Identificación</SeccionTitulo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Nombre / código" name="nombre_equipo" value={form.nombre_equipo} onChange={handleChange} deshabilitado={guardando} />
          {/* Categoría deshabilitada — la API no permite cambiarla */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Categoría</label>
            <input
              value={cat}
              disabled
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                         bg-slate-50 text-slate-400 capitalize"
            />
          </div>
        </div>

        <CampoSelect label="Estado" name="estado" value={form.estado} onChange={handleChange} deshabilitado={guardando}>
          <option value="disponible">Disponible</option>
          <option value="asignado">Asignado</option>
          <option value="en_mantenimiento">En mantenimiento</option>
          {/* Préstamo: asignación temporal sin formalizar */}
          <option value="prestamo">Préstamo</option>
          {/* Robo: activo reportado como robado, queda fuera de circulación */}
          <option value="robo">Robo</option>
        </CampoSelect>

        {/* ── Sección equipo: red y acceso remoto ──────────────────────── */}
        {cat === 'equipo' && (
          <>
            <SeccionTitulo>Red</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="MAC (LAN)"   name="mac"      value={form.mac}      onChange={handleChange} deshabilitado={guardando} />
              <Campo label="MAC (Wi-Fi)" name="mac_wifi" value={form.mac_wifi} onChange={handleChange} deshabilitado={guardando} />
            </div>

            <SeccionTitulo>Acceso remoto</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="TeamViewer ID" name="teamviewer" value={form.teamviewer} onChange={handleChange} deshabilitado={guardando} />
              <Campo label="AnyDesk ID"    name="anydesk"    value={form.anydesk}    onChange={handleChange} deshabilitado={guardando} />
            </div>
          </>
        )}

        {/* ── Hardware: equipo y tablet ─────────────────────────────────── */}
        {(cat === 'equipo' || cat === 'tablet') && (
          <>
            <SeccionTitulo>Hardware</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="SO"           name="sistema_operativo"     value={form.sistema_operativo}     onChange={handleChange} deshabilitado={guardando} />
              <Campo label="Arquitectura" name="arquitectura"           value={form.arquitectura}           onChange={handleChange} deshabilitado={guardando} />
              <Campo label="Procesador"   name="procesador"             value={form.procesador}             onChange={handleChange} deshabilitado={guardando} />
              <Campo label="Generación"   name="generacion_procesador"  value={form.generacion_procesador}  onChange={handleChange} deshabilitado={guardando} />
              <Campo label="Año procesador" name="anio_procesador"      value={form.anio_procesador}        onChange={handleChange} type="number" deshabilitado={guardando} />
              <Campo label="RAM"          name="ram"                    value={form.ram}                    onChange={handleChange} deshabilitado={guardando} />
              {cat === 'equipo' && (
                <Campo label="Disco" name="disco" value={form.disco} onChange={handleChange} deshabilitado={guardando} />
              )}
            </div>
          </>
        )}

        {/* ── Identificación dispositivo ────────────────────────────────── */}
        {cat !== 'licencia' && (
          <>
            <SeccionTitulo>Dispositivo</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Marca"  name="marca"  value={form.marca}  onChange={handleChange} deshabilitado={guardando} />
              <Campo label="Modelo" name="modelo" value={form.modelo} onChange={handleChange} deshabilitado={guardando} />
              <Campo label="Año lanzamiento" name="anio_lanzamiento" value={form.anio_lanzamiento} onChange={handleChange} type="number" deshabilitado={guardando} />
              {(cat === 'celular' || cat === 'tablet') && (
                <Campo label="IMEI" name="imei" value={form.imei} onChange={handleChange} deshabilitado={guardando} />
              )}
            </div>
          </>
        )}

        {/* ── Celular: SO ───────────────────────────────────────────────── */}
        {cat === 'celular' && (
          <Campo label="Sistema operativo" name="sistema_operativo" value={form.sistema_operativo} onChange={handleChange} deshabilitado={guardando} />
        )}

        {/* ── Licencia ──────────────────────────────────────────────────── */}
        {cat === 'licencia' && (
          <>
            <SeccionTitulo>Licencia</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Suite"         name="tipo_suite"    value={form.tipo_suite}    onChange={handleChange} deshabilitado={guardando} />
              <Campo label="Tipo licencia" name="tipo_licencia" value={form.tipo_licencia} onChange={handleChange} deshabilitado={guardando} />
            </div>
          </>
        )}

        {/* ── Accesorios: solo equipo ───────────────────────────────────── */}
        {cat === 'equipo' && (
          <>
            <SeccionTitulo>Accesorios incluidos</SeccionTitulo>
            <div className="grid grid-cols-2 gap-3">
              <CampoCheck label="Alza notebook" name="alza_notebook" checked={form.alza_notebook} onChange={handleCheck} deshabilitado={guardando} />
              <CampoCheck label="Monitor extra"  name="monitor_extra"  checked={form.monitor_extra}  onChange={handleCheck} deshabilitado={guardando} />
              <CampoCheck label="Mochila"        name="mochila"        checked={form.mochila}        onChange={handleCheck} deshabilitado={guardando} />
              <CampoCheck label="Auriculares"    name="auriculares"    checked={form.auriculares}    onChange={handleCheck} deshabilitado={guardando} />
            </div>
          </>
        )}

        {/* ── Compra — solo para equipos físicos (no licencias) ───────────
             Las licencias son activos digitales: no tienen factura de hardware,
             costo de equipo físico ni acta de entrega firmada. */}
        {cat !== 'licencia' && (
          <>
            <SeccionTitulo>Compra</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <CampoSelect label="Tipo documento" name="tipo_documento" value={form.tipo_documento} onChange={handleChange} deshabilitado={guardando}>
                <option value="">Sin documento</option>
                <option value="factura">Factura</option>
                <option value="boleta">Boleta</option>
                <option value="otro">Otro</option>
              </CampoSelect>
              <Campo label="N° factura/boleta"  name="numero_factura"   value={form.numero_factura}   onChange={handleChange} deshabilitado={guardando} />
              <Campo label="Costo (CLP)"        name="costo"            value={form.costo}            onChange={handleChange} type="number" deshabilitado={guardando} />
              <Campo label="Fecha compra"       name="fecha_compra"     value={form.fecha_compra}     onChange={handleChange} type="date"   deshabilitado={guardando} />
              <Campo label="Fecha entrega"      name="fecha_entrega"    value={form.fecha_entrega}    onChange={handleChange} type="date"   deshabilitado={guardando} />
              <Campo label="URL acta entrega"   name="acta_entrega_url" value={form.acta_entrega_url} onChange={handleChange} deshabilitado={guardando} />
            </div>
          </>
        )}

        {/* ── Notas — aplica a todas las categorías ────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="especificaciones" className="text-sm font-medium text-slate-700">Notas / especificaciones</label>
          <textarea
            id="especificaciones"
            name="especificaciones"
            value={form.especificaciones}
            onChange={handleChange}
            disabled={guardando}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                       placeholder:text-slate-400 text-slate-800 resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

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
