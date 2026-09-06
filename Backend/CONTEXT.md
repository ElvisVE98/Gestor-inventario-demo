# CONTEXT.md — ti-inventario-api

Archivo de referencia del proyecto. Sirve como punto de entrada para sesiones nuevas.
Describe el stack, la estructura, los endpoints y las reglas de código.

---

## Stack del proyecto

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | LTS |
| Lenguaje | TypeScript | ^6.0 |
| Framework HTTP | Express | ^5.2 |
| Base de datos | Supabase (PostgreSQL) | ^2.103 |
| Dev server | ts-node + nodemon | — |

**Scripts disponibles:**
```bash
npm run dev    # Servidor de desarrollo con hot-reload
npm run build  # Compila TypeScript → dist/
npm start      # Arranca desde dist/ (producción)
```

**Variables de entorno requeridas (archivo .env):**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=        # anon key — para operaciones normales de base de datos
SUPABASE_SERVICE_ROLE_KEY=   # service_role key — requerida para auth.admin.* (listar/crear/eliminar usuarios)
PORT=3000                    # Opcional, default 3000
NODE_ENV=development
FRONTEND_URL=                # Solo necesaria en producción (para CORS)
```
Ambas keys están en Supabase → Settings → API → Project API keys.

---

## Estructura de carpetas

```
ti-inventario-api/
├── Backend/
│   └── src/
│       ├── app.ts                        # Instancia Express: middlewares + rutas registradas
│       ├── server.ts                     # Punto de entrada: levanta el servidor HTTP
│       ├── config/
│       │   └── supabaseClient.ts         # Instancia de Supabase (anon y service_role)
│       │
│       ├── types/                        # Interfaces TypeScript por módulo
│       │   ├── persona.types.ts          # Persona, CrearPersonaDTO, EditarPersonaDTO, PersonaConActivos
│       │   ├── activo.types.ts           # Activo, CrearActivoDTO, EditarActivoDTO, FiltrosActivo
│       │   ├── asignacion.types.ts       # Asignacion, CrearAsignacionDTO, AsignacionConDetalle
│       │   └── historial.types.ts        # HistorialActividad, CrearHistorialDTO, FiltrosHistorial
│       │
│       ├── middlewares/
│       │   ├── errorHandler.ts           # AppError, errorHandler, helpers: notFound/badRequest/conflict
│       │   └── auth.middleware.ts        # verificarToken: lee Bearer token, llama getUser(), adjunta req.usuario
│       │
│       ├── services/                     # Lógica de negocio + acceso a Supabase
│       │   ├── auth.service.ts           # iniciarSesion, recuperarPassword, cerrarSesion, CRUD admin usuarios
│       │   ├── persona.service.ts        # listarPersonas, obtenerPersonaPorId, crearPersona, editarPersona, desactivarPersona
│       │   ├── activo.service.ts         # listarActivos, obtenerActivoPorId, crearActivo, editarActivo, darDeBajaActivo
│       │   ├── asignacion.service.ts     # listarAsignaciones, obtenerAsignacionPorId, crearAsignacion, devolverActivo
│       │   ├── historial.service.ts      # registrarHistorial, listarHistorial
│       │   └── dashboard.service.ts      # obtenerKPIs (queries en paralelo con Promise.all)
│       │
│       ├── controllers/                  # Handlers HTTP: extrae params → llama service → responde
│       │   ├── auth.controller.ts
│       │   ├── persona.controller.ts
│       │   ├── activo.controller.ts
│       │   ├── asignacion.controller.ts
│       │   └── dashboard.controller.ts
│       │
│       └── routes/                       # Routers de Express por módulo
│           ├── auth.routes.ts            # Login, logout, cambiar-password, recuperar-password, CRUD usuarios
│           ├── persona.routes.ts
│           ├── activo.routes.ts
│           ├── asignacion.routes.ts
│           └── dashboard.routes.ts
│
├── Frontend/                             # Ver Frontend/CONTEXT.md para detalles de arquitectura frontend
└── README.md                             # Documentación global del proyecto
```

**Patrón de capas (siempre de arriba hacia abajo):**
```
Request HTTP
    → app.ts: rutas públicas (/health, /auth/login, /auth/recuperar-password) → responden sin token
    → verificarToken middleware → valida JWT con Supabase, adjunta req.usuario
    → routes        (define qué URL llama a qué controller)
    → controllers   (extrae datos del request, llama al service, devuelve respuesta)
    → services      (lógica de negocio, única capa que habla con Supabase)
    → supabaseClient
```

---

## Endpoints disponibles

### Health y Auth — rutas PÚBLICAS (sin token)
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/health` | Verifica que la API está corriendo |
| POST | `/api/auth/login` | Autentica con email + password. Devuelve JWT |
| POST | `/api/auth/recuperar-password` | Envía email de recuperación. Siempre devuelve éxito |

**Body POST /api/auth/login:**
```json
{ "email": "usuario@empresa.cl", "password": "contraseña" }
```

**Respuesta POST /api/auth/login:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "usuario": { "id": "uuid", "email": "usuario@empresa.cl" }
  }
}
```

**Body POST /api/auth/recuperar-password:**
```json
{ "email": "usuario@empresa.cl" }
```

**Todas las rutas siguientes requieren el header:**
```
Authorization: Bearer <token>
```

### Auth — rutas PRIVADAS (token requerido)
| Método | URL | Descripción |
|--------|-----|-------------|
| POST | `/api/auth/logout` | Invalida el token de sesión actual |
| POST | `/api/auth/cambiar-password` | Cambia contraseña del usuario autenticado |
| GET | `/api/auth/usuarios` | Lista todos los usuarios del sistema (Supabase Auth admin) |
| POST | `/api/auth/usuarios` | Crea usuario nuevo. Queda confirmado inmediatamente |
| DELETE | `/api/auth/usuarios/:id` | Elimina usuario permanentemente. No permite auto-eliminación |

**Body POST /api/auth/cambiar-password:**
```json
{ "passwordActual": "actual", "passwordNueva": "nueva123" }
```
El backend verifica `passwordActual` con Supabase antes de cambiarla.

**Body POST /api/auth/usuarios:**
```json
{ "email": "nuevo@empresa.cl", "password": "minimo6" }
```

### Personas
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/personas` | Lista personas activas. `?incluirInactivos=true` para ver todas |
| GET | `/api/personas/:id` | Detalle con `activos_asignados` (join con asignaciones) |
| POST | `/api/personas` | Crea persona. Valida RUT único |
| PUT | `/api/personas/:id` | Edita persona. No permite cambiar RUT |
| DELETE | `/api/personas/:id` | Desactiva persona (estado→inactivo) y libera sus activos |

**Body POST /api/personas:**
```json
{
  "rut": "12.345.678-9",
  "nombre": "Juan Pérez",
  "correo": "juan@empresa.cl",
  "cargo": "Desarrollador",
  "sucursal": "Santiago",
  "centro_costo": "TI-001"
}
```

### Activos
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/activos` | Lista activos. Excluye `dado_de_baja` por defecto |
| | | Query params: `?categoria=equipo\|celular\|tablet\|licencia` |
| | | `?estado=disponible\|asignado\|en_mantenimiento\|dado_de_baja\|prestamo\|robo` |
| | | `?incluirDadosDeBaja=true` para ver los retirados |
| GET | `/api/activos/:id` | Detalle con `persona_asignada` (join con asignaciones + personas) |
| POST | `/api/activos` | Crea activo. Valida `nombre_equipo` único. Estado inicial: `disponible` |
| PUT | `/api/activos/:id` | Edita activo. No permite cambiar `categoria` |
| DELETE | `/api/activos/:id` | Da de baja (estado→`dado_de_baja`). Cierra asignación activa si existe |

**Body POST /api/activos (mínimo obligatorio):**
```json
{
  "nombre_equipo": "NB-001",
  "categoria": "equipo"
}
```

### Asignaciones
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/asignaciones` | Lista asignaciones activas por defecto |
| | | `?soloActivas=false` para incluir historial cerrado |
| | | `?persona_id=<uuid>` filtra por persona |
| | | `?activo_id=<uuid>` filtra por activo |
| GET | `/api/asignaciones/:id` | Detalle con datos de persona y activo expandidos |
| POST | `/api/asignaciones` | Asigna activo a persona. Cambia estado activo → `asignado` |
| PUT | `/api/asignaciones/:id/devolver` | Cierra asignación. Cambia estado activo → `disponible` |

**Body POST /api/asignaciones:**
```json
{
  "persona_id": "uuid-de-la-persona",
  "activo_id": "uuid-del-activo",
  "fecha_inicio": "2025-01-15T09:00:00Z",
  "observaciones": "Activo entregado con funda incluida"
}
```
`fecha_inicio` y `observaciones` son opcionales. `fecha_inicio` usa la hora actual si se omite.

**Reglas de negocio de asignaciones:**
- Un activo solo puede tener UNA asignación activa (`fecha_fin = null`) a la vez
- Solo se pueden asignar activos en estado `disponible`
- Solo se puede asignar a personas en estado `activo`
- Activos `dado_de_baja`, `en_mantenimiento`, `prestamo` o `robo` no se pueden asignar
- Las asignaciones NUNCA se borran físicamente — son historial permanente

### Dashboard
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/dashboard` | Devuelve todos los KPIs del sistema |

**Respuesta GET /api/dashboard:**
```json
{
  "success": true,
  "data": {
    "total_activos": 120,
    "activos_disponibles": 45,
    "activos_asignados": 68,
    "activos_en_mantenimiento": 5,
    "activos_dados_de_baja": 2,
    "total_equipos": 80,
    "total_celulares": 20,
    "total_tablets": 10,
    "total_licencias": 10,
    "personas_activas": 60,
    "asignaciones_activas": 68,
    "costo_por_sucursal": [
      { "sucursal": "Santiago", "costo_total": 4500000 },
      { "sucursal": "Valparaíso", "costo_total": 1200000 }
    ],
    "activos_por_sucursal": [
      { "sucursal": "Santiago", "total": 52 },
      { "sucursal": "Valparaíso", "total": 16 }
    ],
    "top_centros_costo": [
      { "centro_costo": "TI-001", "total": 30 },
      { "centro_costo": "ADM-002", "total": 18 }
    ]
  }
}
```
- `total_activos` y los conteos por categoría **excluyen** los dados de baja.
- `costo_por_sucursal`: suma del campo `costo` de activos con asignación activa, agrupado por sucursal de la persona. Ignora nulls y ceros. Ordenado de mayor a menor.
- `activos_por_sucursal`: cantidad de activos con asignación activa (fecha_fin IS NULL), agrupado por sucursal. Ordenado de mayor a menor.
- `top_centros_costo`: top 10 centros de costo con más activos asignados actualmente. Ordenado de mayor a menor.

### Formato de respuesta estándar
Todos los endpoints responden con la misma estructura:
```json
// Éxito
{ "success": true, "data": { ... }, "total": 10, "message": "..." }

// Error
{ "success": false, "error": { "message": "Descripción del error" } }
```

---

## Tablas de Supabase

### `personas`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK, generado por Supabase |
| rut | text | Único. Formato: "12.345.678-9" |
| nombre | text | Nombre completo |
| correo | text | Correo corporativo |
| cargo | text | Puesto en la empresa |
| sucursal | text | Oficina donde trabaja |
| centro_costo | text | Para contabilidad interna |
| estado | text | `activo` \| `inactivo` |
| created_at | timestamptz | Auto-generado |

### `activos`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK, generado por Supabase |
| nombre_equipo | text | Único. Ej: "NB-001" |
| categoria | text | `equipo` \| `celular` \| `tablet` \| `licencia` |
| estado | text | `disponible` \| `asignado` \| `en_mantenimiento` \| `dado_de_baja` \| `prestamo` \| `robo` |
| teamviewer | text\|null | Solo equipos |
| anydesk | text\|null | Solo equipos |
| mac | text\|null | MAC ethernet |
| mac_wifi | text\|null | MAC WiFi |
| sistema_operativo | text\|null | — |
| arquitectura | text\|null | "32-bit" \| "64-bit" |
| procesador | text\|null | — |
| generacion_procesador | text\|null | — |
| anio_procesador | int\|null | — |
| ram | text\|null | Ej: "16 GB" |
| disco | text\|null | Ej: "512 GB SSD" |
| modelo | text\|null | — |
| imei | text\|null | Solo celulares y tablets |
| marca | text\|null | — |
| anio_lanzamiento | int\|null | — |
| tipo_suite | text\|null | Solo licencias. Ej: "Microsoft 365" |
| tipo_licencia | text\|null | Solo licencias. Ej: "perpetua" |
| tipo_documento | text\|null | "factura" \| "boleta" |
| numero_factura | text\|null | — |
| costo | numeric\|null | En pesos chilenos |
| fecha_compra | date\|null | — |
| fecha_entrega | date\|null | — |
| alza_notebook | bool\|null | Accesorio incluido |
| monitor_extra | bool\|null | Accesorio incluido |
| mochila | bool\|null | Accesorio incluido |
| auriculares | bool\|null | Accesorio incluido |
| acta_entrega_url | text\|null | URL en Supabase Storage |
| especificaciones | text\|null | Campo libre |
| created_at | timestamptz | Auto-generado |

### `asignaciones`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK, generado por Supabase |
| persona_id | uuid | FK → personas.id |
| activo_id | uuid | FK → activos.id |
| fecha_inicio | timestamptz | Cuándo se asignó |
| fecha_fin | timestamptz\|null | null = asignación activa |
| observaciones | text\|null | Notas libres al momento de asignar |
| created_at | timestamptz | Auto-generado |

### `historial_actividad`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK, generado por Supabase |
| accion | text | Ej: `ACTIVO_ASIGNADO`, `PERSONA_CREADA`, `ACTIVO_DEVUELTO` |
| tabla_afectada | text | `personas` \| `activos` \| `asignaciones` |
| registro_id | uuid | ID del registro que fue modificado |
| detalle | text\|null | Descripción legible del cambio |
| realizado_por | text\|null | Usuario del sistema (hoy siempre "sistema") |
| fecha | timestamptz | Cuándo ocurrió la acción |

**Acciones registradas en el historial:**
- `PERSONA_CREADA` / `PERSONA_EDITADA` / `PERSONA_DESACTIVADA`
- `ACTIVO_CREADO` / `ACTIVO_EDITADO` / `ACTIVO_DADO_DE_BAJA`
- `ACTIVO_ASIGNADO` / `ACTIVO_DEVUELTO`

---

## Rutas del frontend

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/login` | LoginPage | Pública. Login + modo "olvidé mi contraseña" |
| `/` | DashboardPage | KPIs del inventario |
| `/personas` | PersonasPage | Tabla con filtros sucursal/centro_costo/inactivos |
| `/personas/:id` | PersonaDetallePage | Detalle con activos asignados |
| `/activos` | ActivosPage | Tabla con toggle dados de baja + links a categorías |
| `/activos/:id` | ActivoDetallePage | Detalle con historial de asignaciones |
| `/activos/categoria/equipos` | CategoriaActivosPage | Tabla completa de equipos |
| `/activos/categoria/celulares` | CategoriaActivosPage | Tabla completa de celulares |
| `/activos/categoria/tablets` | CategoriaActivosPage | Tabla completa de tablets |
| `/activos/categoria/licencias` | CategoriaActivosPage | Tabla completa de licencias |
| `/archivo` | ArchivoPage | Solo lectura: personas inactivas + activos dados de baja |
| `/configuracion/perfil` | PerfilPage | Email del usuario + cambiar contraseña |
| `/configuracion/usuarios` | UsuariosPage | Gestión de usuarios del sistema |

---

## Reglas de código del proyecto

### Comentarios
- **Comentar absolutamente todo**: cada archivo, cada función, cada variable importante
- Explicar el **por qué**, no solo el qué — el código ya dice qué hace, el comentario debe explicar la razón
- Cada archivo tiene un bloque al inicio explicando qué hace y por qué existe

### Estructura de capas
- Los **controllers** solo extraen datos del request y llaman al service. Sin lógica de negocio.
- Los **services** contienen toda la lógica de negocio y son los únicos que tocan Supabase directamente.
- Las **routes** solo conectan URLs con controllers. Sin lógica.
- Los **tipos** viven en `src/types/` y se importan donde se necesiten.

### Autenticación
- `verificarToken` en `auth.middleware.ts` protege todas las rutas privadas
- Lee el header `Authorization: Bearer <token>` y llama a `supabase.auth.getUser(token)`
- `getUser()` consulta el servidor (no solo decode local) — detecta tokens revocados
- Si es válido adjunta `req.usuario = { id, email }` al request — disponible en controllers
- Rutas **públicas** (sin token): `GET /api/health`, `POST /api/auth/login`, `POST /api/auth/recuperar-password`
- Rutas **privadas** (con token): todo lo demás

### Gestión de usuarios (Supabase Auth admin)
- Usa `supabaseAdmin.auth.admin.*` (cliente con `service_role` key, exportado desde `supabaseClient.ts`)
- El cliente `supabase` normal usa la `anon key` — las operaciones `auth.admin.*` fallan con "User not allowed" con ese cliente
- `createUser` con `email_confirm: true` para que los usuarios no necesiten verificar email
- No se puede eliminar el propio usuario (backend y frontend lo bloquean)
- La eliminación de usuarios es **permanente** — no hay borrado lógico en Auth

### Manejo de errores
- Usar los helpers del `errorHandler`: `notFound()`, `badRequest()`, `conflict()`
- En los controllers: siempre envolver en `try/catch` y pasar a `next(error)`
- En los services: lanzar errores con `throw` directamente (el controller los captura)
- El historial nunca interrumpe el flujo — si falla, solo loguea en consola

### TypeScript
- Tipado estricto pero sin sobreingeniería
- DTOs separados para crear y editar (`CrearXDTO`, `EditarXDTO`)
- `EditarXDTO = Partial<Omit<CrearXDTO, 'campoNoEditable'>>`
- Usar `maybeSingle()` cuando el resultado puede ser null sin que sea un error
- Usar `single()` cuando se espera exactamente un resultado (lanza error si no lo hay)
- No usar `FormEvent` de React (deprecated en versiones recientes) — usar `{ preventDefault(): void }`
- Los tipos de React que deben importarse como `import type { ChangeEvent } from 'react'` (verbatimModuleSyntax lo exige)
- **Nunca definir componentes React dentro de otros componentes** — React los recrea en cada render, desmontando inputs y perdiendo el foco. Todos los sub-componentes van al nivel del módulo (fuera de la función del componente padre)

### Borrado lógico (nunca se borra físicamente)
- Personas: `estado → 'inactivo'`
- Activos: `estado → 'dado_de_baja'`
- Asignaciones: `fecha_fin = timestamp_actual` (nunca se eliminan — son historial)
- **Excepción**: usuarios de Supabase Auth — se eliminan permanentemente con `admin.deleteUser()`

### Consistencia de estados
- Al **asignar** un activo: `activos.estado → 'asignado'`
- Al **devolver** un activo: `activos.estado → 'disponible'` + `asignaciones.fecha_fin = now()`
- Al **desactivar** una persona: se cierran todas sus asignaciones + activos → `'disponible'`
- Al **dar de baja** un activo: se cierra su asignación activa (si existe)

### Estados de activos
- `disponible` → listo para asignar
- `asignado` → en uso por una persona (asignación formal)
- `en_mantenimiento` → en reparación o revisión
- `prestamo` → asignado informalmente sin asignación formal en el sistema
- `robo` → reportado como robado, fuera de circulación
- `dado_de_baja` → retirado del servicio (borrado lógico)
