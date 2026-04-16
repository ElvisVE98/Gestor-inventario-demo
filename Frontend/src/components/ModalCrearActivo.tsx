/**
 * ModalCrearActivo.tsx
 *
 * Formulario modal para crear un activo nuevo.
 * Los campos visibles cambian según la categoría seleccionada:
 *   equipo   → red, acceso remoto, hardware, accesorios
 *   celular  → IMEI, SO básico
 *   tablet   → IMEI, SO, RAM, arquitectura
 *   licencia → tipo_suite, tipo_licencia
 *   todos    → sección de compra + notas
 *
 * Al guardar con éxito llama a onCreado(activo) para que la página
 * actualice su lista sin recargar desde la API.
 */

import { useState } from 'react'
import type { ChangeEvent } from 'react'
import Modal from './Modal'
import { crearActivo } from '../services/activo.service'
import type { Activo, CategoriaActivo, CrearActivoDTO } from '../types/activo.types'

interface Props {
  onClose: () => void
  onCreado: (activo: Activo) => void
}

// ── Componentes auxiliares de formulario ─────────────────────────────────────

/**
 * Campo de texto/número con label.
 */
function Campo({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  deshabilitado,
  requerido,
}: {
  label: string
  name: string
  type?: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  deshabilitado?: boolean
  requerido?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}{requerido && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={requerido}
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
 * Select con label.
 */
function CampoSelect({
  label,
  name,
  value,
  onChange,
  children,
  deshabilitado,
  requerido,
}: {
  label: string
  name: string
  value: string
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
  deshabilitado?: boolean
  requerido?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}{requerido && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={requerido}
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

/**
 * Checkbox con label inline.
 */
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

/**
 * Encabezado de sección dentro del formulario.
 */
function SeccionTitulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest pt-2">
      {children}
    </p>
  )
}

// ── Estado inicial del formulario ────────────────────────────────────────────

type FormActivo = {
  // Campos base — siempre presentes
  nombre_equipo: string
  categoria: CategoriaActivo | ''
  estado: string
  // Equipo / tablet
  sistema_operativo: string
  arquitectura: string
  procesador: string
  generacion_procesador: string
  anio_procesador: string
  ram: string
  disco: string
  // Equipo — red
  mac: string
  mac_wifi: string
  // Equipo — acceso remoto
  teamviewer: string
  anydesk: string
  // Equipo — accesorios (checkboxes)
  alza_notebook: boolean
  monitor_extra: boolean
  mochila: boolean
  auriculares: boolean
  // Celular / tablet
  imei: string
  // Común a equipos, celulares, tablets
  marca: string
  modelo: string
  anio_lanzamiento: string
  // Licencia
  tipo_suite: string
  tipo_licencia: string
  // Compra
  tipo_documento: string
  numero_factura: string
  costo: string
  fecha_compra: string
  fecha_entrega: string
  // Otros
  acta_entrega_url: string
  especificaciones: string
}

const FORM_VACIO: FormActivo = {
  nombre_equipo: '',
  categoria: '',
  estado: 'disponible',
  sistema_operativo: '',
  arquitectura: '',
  procesador: '',
  generacion_procesador: '',
  anio_procesador: '',
  ram: '',
  disco: '',
  mac: '',
  mac_wifi: '',
  teamviewer: '',
  anydesk: '',
  alza_notebook: false,
  monitor_extra: false,
  mochila: false,
  auriculares: false,
  imei: '',
  marca: '',
  modelo: '',
  anio_lanzamiento: '',
  tipo_suite: '',
  tipo_licencia: '',
  tipo_documento: '',
  numero_factura: '',
  costo: '',
  fecha_compra: '',
  fecha_entrega: '',
  acta_entrega_url: '',
  especificaciones: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convierte el FormActivo (todo strings + booleans) a CrearActivoDTO.
 * Descarta strings vacíos para no enviar campos nulos innecesarios.
 * Convierte años y costo a número cuando corresponde.
 */
function prepararDatos(form: FormActivo): CrearActivoDTO {
  if (!form.categoria) throw new Error('Selecciona una categoría')

  const dto: CrearActivoDTO = {
    nombre_equipo: form.nombre_equipo.trim(),
    categoria: form.categoria,
  }

  // Estado solo si no es el default (el backend lo maneja como 'disponible' por defecto)
  if (form.estado) dto.estado = form.estado as CrearActivoDTO['estado']

  // Función auxiliar: agrega el campo si no es string vacío
  const str = (val: string): string | undefined => val.trim() || undefined
  const num = (val: string): number | undefined => val.trim() ? Number(val) : undefined

  const cat = form.categoria

  if (cat === 'equipo') {
    dto.teamviewer = str(form.teamviewer)
    dto.anydesk    = str(form.anydesk)
    dto.mac        = str(form.mac)
    dto.mac_wifi   = str(form.mac_wifi)
  }

  if (cat === 'equipo' || cat === 'tablet') {
    dto.sistema_operativo      = str(form.sistema_operativo)
    dto.arquitectura           = str(form.arquitectura)
    dto.procesador             = str(form.procesador)
    dto.generacion_procesador  = str(form.generacion_procesador)
    dto.anio_procesador        = num(form.anio_procesador)
    dto.ram                    = str(form.ram)
    dto.disco                  = str(form.disco)
  }

  if (cat === 'celular' || cat === 'tablet') {
    dto.imei = str(form.imei)
  }

  if (cat !== 'licencia') {
    dto.marca           = str(form.marca)
    dto.modelo          = str(form.modelo)
    dto.anio_lanzamiento = num(form.anio_lanzamiento)
  }

  if (cat === 'equipo') {
    // Solo enviamos los accesorios que son true para no mandar falsos innecesarios
    if (form.alza_notebook) dto.alza_notebook = true
    if (form.monitor_extra) dto.monitor_extra = true
    if (form.mochila)       dto.mochila       = true
    if (form.auriculares)   dto.auriculares   = true
  }

  if (cat === 'licencia') {
    dto.tipo_suite   = str(form.tipo_suite)
    dto.tipo_licencia = str(form.tipo_licencia)
  }

  // Sección compra — solo aplica a equipos físicos, no a licencias.
  // Las licencias no tienen factura, costo de hardware ni acta de entrega física.
  if (cat !== 'licencia') {
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

export default function ModalCrearActivo({ onClose, onCreado }: Props) {
  const [form, setForm]       = useState<FormActivo>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const cat = form.categoria

  /** Manejador genérico para inputs de texto/número/select */
  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  /** Manejador para checkboxes */
  function handleCheck(e: ChangeEvent<HTMLInputElement>) {
    const { name, checked } = e.target
    setForm(prev => ({ ...prev, [name]: checked }))
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      const datos = prepararDatos(form)
      const nuevo = await crearActivo(datos)
      onCreado(nuevo)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el activo'
      setError(msg)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Nuevo activo" onClose={onClose} ancho="lg" scrollable>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* ── Datos base ─────────────────────────────────────────────────── */}
        <SeccionTitulo>Identificación</SeccionTitulo>

        <div className="grid grid-cols-2 gap-4">
          <Campo
            label="Nombre / código"
            name="nombre_equipo"
            value={form.nombre_equipo}
            onChange={handleChange}
            placeholder="NB-001"
            deshabilitado={guardando}
            requerido
          />
          <CampoSelect
            label="Categoría"
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            deshabilitado={guardando}
            requerido
          >
            <option value="">Seleccionar...</option>
            <option value="equipo">Equipo</option>
            <option value="celular">Celular</option>
            <option value="tablet">Tablet</option>
            <option value="licencia">Licencia</option>
          </CampoSelect>
        </div>

        <CampoSelect
          label="Estado inicial"
          name="estado"
          value={form.estado}
          onChange={handleChange}
          deshabilitado={guardando}
        >
          <option value="disponible">Disponible</option>
          <option value="en_mantenimiento">En mantenimiento</option>
          {/* Préstamo: asignación temporal sin formalizar en el sistema */}
          <option value="prestamo">Préstamo</option>
        </CampoSelect>

        {/* ── Sección equipo: red y acceso remoto ──────────────────────── */}
        {cat === 'equipo' && (
          <>
            <SeccionTitulo>Red</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="MAC (LAN)"  name="mac"      value={form.mac}      onChange={handleChange} placeholder="AA:BB:CC:DD:EE:FF" deshabilitado={guardando} />
              <Campo label="MAC (Wi-Fi)" name="mac_wifi" value={form.mac_wifi} onChange={handleChange} placeholder="AA:BB:CC:DD:EE:FF" deshabilitado={guardando} />
            </div>

            <SeccionTitulo>Acceso remoto</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="TeamViewer ID" name="teamviewer" value={form.teamviewer} onChange={handleChange} placeholder="123 456 789" deshabilitado={guardando} />
              <Campo label="AnyDesk ID"    name="anydesk"    value={form.anydesk}    onChange={handleChange} placeholder="987 654 321" deshabilitado={guardando} />
            </div>
          </>
        )}

        {/* ── Hardware: equipo y tablet ─────────────────────────────────── */}
        {(cat === 'equipo' || cat === 'tablet') && (
          <>
            <SeccionTitulo>Hardware</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="SO"           name="sistema_operativo"     value={form.sistema_operativo}     onChange={handleChange} placeholder="Windows 11" deshabilitado={guardando} />
              <Campo label="Arquitectura" name="arquitectura"           value={form.arquitectura}           onChange={handleChange} placeholder="x64"        deshabilitado={guardando} />
              <Campo label="Procesador"   name="procesador"             value={form.procesador}             onChange={handleChange} placeholder="Intel Core i5" deshabilitado={guardando} />
              <Campo label="Generación"   name="generacion_procesador"  value={form.generacion_procesador}  onChange={handleChange} placeholder="12a gen"    deshabilitado={guardando} />
              <Campo label="Año procesador" name="anio_procesador"      value={form.anio_procesador}        onChange={handleChange} placeholder="2022" type="number" deshabilitado={guardando} />
              <Campo label="RAM"          name="ram"                    value={form.ram}                    onChange={handleChange} placeholder="16 GB"      deshabilitado={guardando} />
              {cat === 'equipo' && (
                <Campo label="Disco"      name="disco"                  value={form.disco}                  onChange={handleChange} placeholder="512 GB SSD" deshabilitado={guardando} />
              )}
            </div>
          </>
        )}

        {/* ── Identificación dispositivo: no-licencia ───────────────────── */}
        {cat !== 'licencia' && cat !== '' && (
          <>
            <SeccionTitulo>Dispositivo</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Marca"  name="marca"  value={form.marca}  onChange={handleChange} placeholder="Dell"       deshabilitado={guardando} />
              <Campo label="Modelo" name="modelo" value={form.modelo} onChange={handleChange} placeholder="Latitude 5420" deshabilitado={guardando} />
              <Campo label="Año de lanzamiento" name="anio_lanzamiento" value={form.anio_lanzamiento} onChange={handleChange} placeholder="2022" type="number" deshabilitado={guardando} />
              {(cat === 'celular' || cat === 'tablet') && (
                <Campo label="IMEI" name="imei" value={form.imei} onChange={handleChange} placeholder="353XXXXXXXXX" deshabilitado={guardando} />
              )}
            </div>
          </>
        )}

        {/* ── Celular: SO básico ────────────────────────────────────────── */}
        {cat === 'celular' && (
          <Campo label="Sistema operativo" name="sistema_operativo" value={form.sistema_operativo} onChange={handleChange} placeholder="Android 14" deshabilitado={guardando} />
        )}

        {/* ── Licencia ──────────────────────────────────────────────────── */}
        {cat === 'licencia' && (
          <>
            <SeccionTitulo>Licencia</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Suite"          name="tipo_suite"    value={form.tipo_suite}    onChange={handleChange} placeholder="Microsoft 365" deshabilitado={guardando} />
              <Campo label="Tipo licencia"  name="tipo_licencia" value={form.tipo_licencia} onChange={handleChange} placeholder="Business Basic" deshabilitado={guardando} />
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
        {cat !== '' && cat !== 'licencia' && (
          <>
            <SeccionTitulo>Compra</SeccionTitulo>
            <div className="grid grid-cols-2 gap-4">
              <CampoSelect label="Tipo documento" name="tipo_documento" value={form.tipo_documento} onChange={handleChange} deshabilitado={guardando}>
                <option value="">Sin documento</option>
                <option value="factura">Factura</option>
                <option value="boleta">Boleta</option>
                <option value="otro">Otro</option>
              </CampoSelect>
              <Campo label="N° factura/boleta"  name="numero_factura"   value={form.numero_factura}   onChange={handleChange} placeholder="001-0000123" deshabilitado={guardando} />
              <Campo label="Costo (CLP)"        name="costo"            value={form.costo}            onChange={handleChange} placeholder="890000" type="number" deshabilitado={guardando} />
              <Campo label="Fecha compra"       name="fecha_compra"     value={form.fecha_compra}     onChange={handleChange} type="date" deshabilitado={guardando} />
              <Campo label="Fecha entrega"      name="fecha_entrega"    value={form.fecha_entrega}    onChange={handleChange} type="date" deshabilitado={guardando} />
              <Campo label="URL acta entrega"   name="acta_entrega_url" value={form.acta_entrega_url} onChange={handleChange} placeholder="https://..." deshabilitado={guardando} />
            </div>
          </>
        )}

        {/* ── Notas — aplica a todas las categorías ────────────────────── */}
        {cat !== '' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="especificaciones" className="text-sm font-medium text-slate-700">Notas / especificaciones</label>
            <textarea
              id="especificaciones"
              name="especificaciones"
              value={form.especificaciones}
              onChange={handleChange}
              disabled={guardando}
              rows={3}
              placeholder="Información adicional relevante..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg
                         placeholder:text-slate-400 text-slate-800 resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        )}

        {/* Error del backend */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Acciones */}
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
            disabled={guardando || !form.categoria}
            className="px-4 py-2 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 rounded-lg
                       transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {guardando ? 'Guardando...' : 'Crear activo'}
          </button>
        </div>

      </form>
    </Modal>
  )
}
