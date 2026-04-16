/**
 * server.ts
 *
 * Punto de entrada del servidor. Su única responsabilidad es:
 *   1. Cargar las variables de entorno desde .env
 *   2. Importar la app de Express ya configurada
 *   3. Arrancar el servidor en el puerto especificado
 *
 * Separamos esto de app.ts para que la configuración de Express
 * sea independiente del acto de "levantar" el servidor.
 */

import dotenv from 'dotenv';

// Cargamos .env lo antes posible, antes de importar cualquier otro módulo
// que pueda necesitar las variables de entorno (como supabaseClient.ts)
dotenv.config();

import app from './app';

// Puerto desde la variable de entorno, con fallback a 3000 para desarrollo
const PORT = process.env.PORT ?? 3000;

// Levantamos el servidor
const server = app.listen(PORT, () => {
  console.log(`\n🚀 TI Inventario API corriendo en http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

// Manejo de cierre limpio: cuando el proceso recibe SIGTERM (ej: Ctrl+C o deploy),
// cerramos el servidor correctamente antes de terminar
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado.');
    process.exit(0);
  });
});
