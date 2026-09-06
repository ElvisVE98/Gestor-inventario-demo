# Sistema Gestor de Inventario TI y Asignaciones

Plataforma web empresarial para la gestión, control, trazabilidad y asignación de equipamiento tecnológico a colaboradores. Desarrollada con arquitectura limpia (*Clean Architecture*), tipado estricto en TypeScript y separación modular entre Backend y Frontend.

---

## 🚀 Arquitectura General y Stack

El proyecto está estructurado como un monorepo modular:

```text
demo-inventario/
├── Backend/                 # API REST construida con Express, TypeScript y Supabase
│   ├── src/
│   │   ├── config/          # Cliente Supabase centralizado (anon y service_role)
│   │   ├── controllers/     # Controladores HTTP
│   │   ├── middlewares/     # Manejo de errores y verificación de JWT
│   │   ├── routes/          # Enrutamiento modular por dominio
│   │   ├── services/        # Lógica de negocio, base de datos y auditoría
│   │   └── types/           # Interfaces y DTOs
│   └── CONTEXT.md           # Documentación técnica detallada del Backend
│
├── Frontend/                # Single Page Application (SPA) con React y Vite
│   ├── src/
│   │   ├── api/             # Cliente Axios centralizado e interceptores JWT
│   │   ├── components/      # Componentes modulares (layout, modals, ui)
│   │   ├── context/         # Estado global de sesión (AuthContext)
│   │   ├── pages/           # Vistas y pantallas completas
│   │   ├── types/           # Definiciones TypeScript
│   │   └── utils/           # Utilidades (exportación CSV/Excel)
│   └── CONTEXT.md           # Documentación técnica detallada del Frontend
│
└── README.md                # Este archivo
```

---

## 🛠️ Tecnologías Utilizadas

### Backend
- **Runtime:** Node.js (LTS)
- **Lenguaje:** TypeScript (^6.0)
- **Framework HTTP:** Express (^5.2)
- **Base de Datos & Autenticación:** Supabase (PostgreSQL + Supabase Auth)
- **Herramientas de Dev:** `ts-node`, `nodemon`

### Frontend
- **Framework / Bundler:** Vite (^8.0)
- **Librería UI:** React (^19.2)
- **Lenguaje:** TypeScript (^6.0)
- **Cliente HTTP:** Axios (^1.8) con Request/Response Interceptors
- **Estilos:** TailwindCSS (^4.2)
- **Enrutamiento:** React Router (^7.14)
- **Gráficos:** Recharts (^3.8)

---

## 📋 Módulos y Funcionalidades

1. **Dashboard de Métricas y KPIs**:
   - Resumen total de activos, asignados, disponibles y dados de baja.
   - Gráficos interactivos por categoría y distribución de estado.
2. **Gestión de Inventario (Activos)**:
   - Registro de equipos (Notebooks, Monitores, Periféricos, etc.).
   - Filtros dinámicos por estado, categoría y búsqueda en tiempo real.
   - Ficha técnica por equipo con historial de todas sus asignaciones pasadas y actuales.
   - Baja lógica de activos.
3. **Gestión de Colaboradores (Personas)**:
   - Registro de personal con RUT, cargo, área, sucursal y centro de costo.
   - Vista de detalle con lista de activos en custodia activa.
   - Desactivación lógica (liberando automáticamente los activos asociados).
4. **Asignaciones y Devoluciones**:
   - Asignación ágil de activos disponibles a colaboradores activos.
   - Cierre de asignaciones (devolución) con registro de observaciones y fecha de término.
5. **Archivo Histórico**:
   - Registro de colaboradores inactivos y equipos dados de baja para auditoría.
6. **Auditoría de Actividad**:
   - Trazabilidad automática de creación, edición, asignación, devolución y baja indicando el usuario responsable.
7. **Seguridad y Usuarios**:
   - Autenticación mediante JWT en Supabase Auth.
   - Recuperación de contraseña por correo electrónico.
   - Panel de administración de usuarios (exclusivo rol ADMIN).

---

## ⚙️ Puesta en Marcha Local

### 1. Requisitos Previos
- Node.js versión 18+ instalado.
- Proyecto activo en Supabase con las tablas y credenciales requeridas.

---

### 2. Configurar y Levantar el Backend

1. Entrar al directorio `Backend`:
   ```bash
   cd Backend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno (`.env` en `Backend/`):
   ```env
   PORT=3000
   NODE_ENV=development
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_KEY=tu_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```
4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   *El backend quedará disponible en `http://localhost:3000`*.

---

### 3. Configurar y Levantar el Frontend

1. Entrar al directorio `Frontend`:
   ```bash
   cd Frontend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno (`.env` en `Frontend/`):
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```
4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   *El frontend quedará disponible en `http://localhost:5173`*.

---

## 📖 Documentación Adicional

- Para detalles exhaustivos de los endpoints, controladores y base de datos, consulta [Backend/CONTEXT.md](file:///c:/Users/evelasquez/demo-inventario/Gestor-inventario-demo/Backend/CONTEXT.md).
- Para detalles sobre la arquitectura de componentes, contexto de autenticación e interceptores de Axios, consulta [Frontend/CONTEXT.md](file:///c:/Users/evelasquez/demo-inventario/Gestor-inventario-demo/Frontend/CONTEXT.md).
