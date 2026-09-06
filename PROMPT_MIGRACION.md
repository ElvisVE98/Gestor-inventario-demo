# PROMPT MAESTRO PARA REPLICAR TODAS LAS MEJORAS EN EL PROYECTO PRINCIPAL

> **Instrucciones de uso:**
> Copia y pega el contenido de abajo directamente en tu asistente de IA (Claude Code / Antigravity / Cursor) en el proyecto principal de tu empresa. El prompt está formulado de forma exhaustiva, modular y paso a paso para que replique con 100% de exactitud toda la arquitectura limpia, librerías, correcciones de UX y tipado sin romper nada.

---

```markdown
Actúa como un desarrollador Fullstack Senior experto en Node.js, Express, TypeScript, React 19 y Clean Architecture.
Necesito que realices una refactorización integral y modernización de este repositorio siguiendo exactamente las mejores prácticas de código limpio (Clean Code y Clean Architecture), eliminando duplicaciones (Principio DRY) y corrigiendo defectos de UX, rutas y lógica.

No rompas ninguna funcionalidad existente. Sigue rigurosamente las siguientes fases paso a paso, manteniendo todo el código comentado en español de forma clara, sencilla y pedagógica:

---

### FASE 1: REFACTORIZACIÓN Y CORRECCIONES EN EL BACKEND (Node.js + Express + TypeScript)

1. **Centralización de Supabase (`Backend/src/config/supabaseClient.ts`)**:
   - Crea la carpeta `src/config/` y el archivo `supabaseClient.ts`.
   - Configura la directiva `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` para certificados corporativos locales.
   - Inicializa y exporta `supabase` (usando `SUPABASE_SERVICE_KEY` anon) y `supabaseAdmin` (usando `SUPABASE_SERVICE_ROLE_KEY`).
   - Actualiza todos los servicios y middlewares para importar el cliente desde `../config/supabaseClient`.

2. **Modularización de Autenticación (`auth.service.ts` + `auth.controller.ts` + `auth.routes.ts`)**:
   - Extrae toda la lógica de negocio y consultas de `auth.routes.ts` hacia `src/services/auth.service.ts` (`iniciarSesion`, `recuperarPassword`, `cerrarSesion`, `listarUsuarios`, `crearUsuarioAdmin`, `eliminarUsuarioAdmin`).
   - Crea `src/controllers/auth.controller.ts` para manejar req/res y códigos HTTP.
   - Deja `src/routes/auth.routes.ts` únicamente con la declaración de rutas y asignación a los métodos del controlador.

3. **Auditoría de Actividad con Usuario Real**:
   - En `src/services/persona.service.ts`, `src/services/activo.service.ts` y `src/services/asignacion.service.ts`, asegúrate de recibir el email del usuario autenticado (`req.usuario?.email` proveniente del middleware `verificarToken`) y pasarlo al `historial.service.ts` para registrar autoría en cada operación (crear, editar, desactivar, dar de baja, asignar, devolver).

4. **Persistencia de Observaciones en Devoluciones**:
   - En `src/services/asignacion.service.ts` y `src/controllers/asignacion.controller.ts`, asegura que el endpoint de devolución (`PUT /asignaciones/:id/devolver`) reciba y guarde correctamente el campo `observaciones` en la base de datos.

5. **Documentación del Backend**:
   - Crea/actualiza `Backend/CONTEXT.md` documentando la arquitectura en capas (Rutas → Controladores → Servicios → Supabase), endpoints y variables de entorno.

---

### FASE 2: ESTRUCTURA DE COMPONENTES Y FIXES DE UX EN EL FRONTEND

1. **Corrección del Enrutador Raíz (`Frontend/src/App.tsx`)**:
   - Elimina cualquier `<Route path="/" element={<Navigate to="/login" replace />} />` redundante que entre en conflicto con el Layout protegido, de modo que al ingresar a la raíz (`/`) con sesión activa se muestre el `<Layout />` y `<DashboardPage />`.

2. **Cálculo de Progreso en Dashboard (`Frontend/src/pages/DashboardPage.tsx`)**:
   - Asegura que el gran total para la barra de progreso sume los activos disponibles, asignados y los dados de baja: `granTotalActivos = total_activos + activos_dados_de_baja`.

3. **Reorganización Modular de `Frontend/src/components/`**:
   - Mueve físicamente los componentes a 3 subcarpetas por responsabilidad:
     - `src/components/layout/`: `Layout.tsx`, `Sidebar.tsx`, `ProtectedRoute.tsx`.
     - `src/components/modals/`: `Modal.tsx`, `ModalConfirmar.tsx`, `ModalCrearActivo.tsx`, `ModalEditarActivo.tsx`, `ModalAsignarActivo.tsx`, `ModalDevolverActivo.tsx`, `ModalCrearPersona.tsx`, `ModalEditarPersona.tsx`.
     - `src/components/ui/`: `KpiCard.tsx`.

4. **Corrección de UX en Layout y Sidebar (Footer Fijo de Cerrar Sesión)**:
   - En `src/components/layout/Layout.tsx`, utiliza `<div className="flex h-screen overflow-hidden bg-slate-50">` con `<main className="flex-1 overflow-y-auto">` para que el scroll pertenezca al contenido principal.
   - En `src/components/layout/Sidebar.tsx`, configura `<aside className="w-60 shrink-0 bg-slate-900 flex flex-col h-screen">` con `<nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">`, garantizando que el footer con el email del usuario y el botón de "Cerrar sesión" permanezcan **siempre visibles y anclados al fondo de la pantalla** sin importar el largo de la página.

---

### FASE 3: MIGRACIÓN A AXIOS Y PRINCIPIO DRY EN EL FRONTEND

1. **Instalación de Axios**:
   - Instala `axios` en el `Frontend`.

2. **Cliente Centralizado (`Frontend/src/api/axios.config.ts`)**:
   - Crea `axios.config.ts` configurando `baseURL: import.meta.env.VITE_API_URL`.
   - Agrega **Request Interceptor**: Lee la clave `auth_token` de `localStorage` y adjunta `Authorization: Bearer <token>` (sin dependencias circulares con `auth.api.ts`).
   - Agrega **Response Interceptor**: Desempaqueta `response.data.data` (o `response.data`) y procesa de forma homogénea los mensajes de error del Backend.

3. **Módulos de API por Dominio (`Frontend/src/api/`)**:
   - Crea:
     - `auth.api.ts`: Login, logout, cambio/recuperación de password y gestión de token en localStorage.
     - `persona.api.ts`: Métodos CRUD con Axios (`getPersonas`, `getPersonasTodas`, `getPersonaById`, `crearPersona`, `editarPersona`, `desactivarPersona`).
     - `activo.api.ts`: Métodos CRUD con Axios (`getActivos`, `getActivosConBaja`, `getActivoById`, `crearActivo`, `editarActivo`, `darDeBaja`).
     - `asignacion.api.ts`: (`getAsignaciones`, `getAsignacionesPorActivo`, `crearAsignacion`, `devolverActivo`).
     - `archivo.api.ts`: (`getPersonasInactivas`, `getActivosDadosDeBaja`).
     - `dashboard.api.ts`: (`obtenerDashboard`).
   - Elimina por completo la carpeta antigua `src/services/`.

4. **Actualización de Importaciones**:
   - Actualiza todos los `import` en las páginas (`src/pages/*.tsx`), modales (`src/components/modals/*.tsx`), layout y `src/context/AuthContext.tsx` para que consuman `src/api/*` y las nuevas rutas de componentes.

5. **Limpieza de Recursos**:
   - Elimina `react.svg` y `vite.svg` de `src/assets/`.

6. **Documentación del Frontend**:
   - Crea `Frontend/CONTEXT.md` explicando el stack, árbol de carpetas, cliente Axios, interceptores y reglas de UI.

---

### FASE 4: DOCUMENTACIÓN GLOBAL Y VERIFICACIÓN FINAL

1. **README Global**:
   - Crea un `README.md` en la raíz explicando la visión global del sistema (Gestor de Inventario TI y Asignaciones), stack completo, módulos funcionales y guía de ejecución local paso a paso.

2. **Verificación de Compilación**:
   - Ejecuta `npm run build` en `Backend/` y certifica salida exitosa (0 errores de TypeScript).
   - Ejecuta `npm run build` en `Frontend/` y certifica salida exitosa con Vite (0 errores de TypeScript).
```
