# CONTEXT.md — ti-inventario-web (Frontend)

Archivo de referencia técnica y arquitectura del Frontend. Sirve como guía de entrada para entender el stack, la estructura de componentes, la capa de comunicación HTTP (Axios) y las reglas de diseño.

---

## Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Runtime / Build Tool** | Vite | ^8.0 | Bundler ultra rápido con HMR |
| **Librería UI** | React | ^19.2 | Renderizado declarativo por componentes |
| **Lenguaje** | TypeScript | ^6.0 | Tipado estático estricto |
| **Enrutamiento** | React Router | ^7.14 | Enrutamiento del lado del cliente (SPA) |
| **Cliente HTTP** | Axios | ^1.8 | Peticiones HTTP con interceptores JWT |
| **Estilos** | TailwindCSS | ^4.2 | Utilidades de diseño responsivo |
| **Gráficos / Métricas**| Recharts | ^3.8 | Gráficos visuales en el Dashboard |

**Scripts disponibles en `Frontend/`:**
```bash
npm run dev    # Levanta el servidor local de Vite (http://localhost:5173)
npm run build  # Compila TypeScript y empaqueta la app para producción en dist/
npm run lint   # Ejecuta el linter ESLint
```

**Variables de entorno (`.env` en `Frontend/`):**
```env
VITE_API_URL=http://localhost:3000/api
```

---

## Estructura de Carpetas (Clean Architecture)

```text
Frontend/src/
├── api/                     # Capa de comunicación HTTP con el Backend
│   ├── axios.config.ts      # Cliente central Axios, baseURL e interceptores (JWT + Errores)
│   ├── auth.api.ts          # Login, logout, restablecimiento de contraseña y gestión de token
│   ├── persona.api.ts       # CRUD de personas (colaboradores)
│   ├── activo.api.ts        # CRUD de activos e inventario tecnológico
│   ├── asignacion.api.ts    # Asignaciones y devoluciones con notas
│   ├── archivo.api.ts       # Registros históricos (inactivos y dados de baja)
│   └── dashboard.api.ts     # KPIs y métricas del dashboard principal
│
├── assets/                  # Recursos estáticos e imágenes (hero.png, etc.)
│
├── components/              # Componentes visuales organizados por responsabilidad
│   ├── layout/              # Estructura visual de la aplicación
│   │   ├── Layout.tsx       # Shell general con Sidebar y <Outlet />
│   │   ├── Sidebar.tsx      # Barra lateral de navegación con items y logout
│   │   └── ProtectedRoute.tsx # Guard que redirige a /login si no hay sesión
│   ├── modals/              # Ventanas emergentes y formularios interactivos
│   │   ├── Modal.tsx        # Contenedor base de modal con backdrop y animación
│   │   ├── ModalConfirmar.tsx
│   │   ├── ModalCrearActivo.tsx
│   │   ├── ModalEditarActivo.tsx
│   │   ├── ModalAsignarActivo.tsx
│   │   ├── ModalDevolverActivo.tsx
│   │   ├── ModalCrearPersona.tsx
│   │   └── ModalEditarPersona.tsx
│   └── ui/                  # Piezas visuales atómicas y reutilizables
│       └── KpiCard.tsx      # Tarjeta visual para métricas y KPIs
│
├── context/                 # Estado global de React
│   └── AuthContext.tsx      # Proveedor de sesión (usuario, token, login, logout)
│
├── pages/                   # Vistas completas enlazadas a rutas (React Router)
│   ├── ActivoDetallePage.tsx    # Detalle de equipo e historial de asignaciones
│   ├── ActivosPage.tsx          # Tabla de inventario con filtros y búsqueda
│   ├── ArchivoPage.tsx          # Historial de archivados (bajas e inactivos)
│   ├── CategoriaActivosPage.tsx # Vista filtrada por categoría de equipo
│   ├── DashboardPage.tsx        # Métricas, KPIs y gráficos visuales
│   ├── LoginPage.tsx            # Formulario de inicio de sesión y recuperación
│   ├── PerfilPage.tsx           # Datos del usuario y cambio de contraseña
│   ├── PersonaDetallePage.tsx   # Perfil del colaborador y sus equipos asignados
│   ├── PersonasPage.tsx         # Gestión y listado de colaboradores
│   └── UsuariosPage.tsx         # Administración de cuentas de acceso (Solo ADMIN)
│
├── types/                   # Interfaces y tipos TypeScript organizados por dominio
│   ├── activo.types.ts
│   ├── api.types.ts
│   ├── asignacion.types.ts
│   ├── auth.types.ts
│   ├── dashboard.types.ts
│   └── persona.types.ts
│
├── utils/                   # Funciones puras independientes
│   └── exportarCsv.ts       # Exportación de datos tabulares a CSV/Excel
│
├── App.tsx                  # Definición del árbol de rutas protegidas y públicas
├── main.tsx                 # Montaje de la aplicación en el DOM
└── index.css                # Estilos globales y directivas de TailwindCSS
```

---

## Flujo de Autenticación y Axios

1. **Inicio de Sesión**:
   - `LoginPage.tsx` envía email y contraseña a través de `login()` de `AuthContext.tsx`.
   - `auth.api.ts` envía la petición `POST /auth/login` con Axios.
   - El token JWT recibido se almacena en `localStorage` (`auth_token`) y el usuario en `auth_usuario`.
2. **Inyección Automática del Token (Axios Request Interceptor)**:
   - En cada petición saliente, `axios.config.ts` lee el token de `localStorage` y adjunta el header `Authorization: Bearer <token>`.
3. **Manejo Centralizado de Respuestas (Axios Response Interceptor)**:
   - Si el backend responde `{ success: true, data: [...] }`, el interceptor entrega directamente `data`.
   - Si ocurre un error (401, 404, 500), extrae el mensaje de error del backend y rechaza la promesa con un `Error(mensaje)`.
4. **Protección de Rutas (`ProtectedRoute.tsx`)**:
   - Si el usuario intenta entrar a `/activos` o `/dashboard` sin token, es redirigido inmediatamente a `/login`.

---

## Reglas de Desarrollo y Buenas Prácticas

1. **Principio DRY**: Nunca duplicar la `baseURL` ni la lógica de headers; todo pasa por `axios.config.ts`.
2. **Separación de Responsabilidades**:
   - Las **páginas (`pages/`)** coordinan y cargan datos.
   - Los **componentes (`components/`)** renderizan interfaces y formularios.
   - Los **módulos de API (`api/`)** solo ejecutan llamadas HTTP.
3. **Manejo de Formularios en Modales**: Los modales gestionan su propio estado local de carga (`loading`) y error (`error`), notificando a la página padre mediante callbacks (`onCreado`, `onClose`) para recargar la tabla correspondiente.
