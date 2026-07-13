import app from './app.js';
import { env } from './config/env.js';
import { CacheProviderFactory } from './services/cache/CacheProviderFactory.js';
import prisma from './config/prisma.js';
import logger from './utils/logger.js';

const PORT = env.PORT;
const cacheProvider = CacheProviderFactory.getProvider();

async function startServer() {
  try {
    // 1. Conectar a la caché
    await cacheProvider.connect();

    // 2. Probar conexión a la base de datos
    await prisma.$connect();
    logger.info('💾 Conexión con PostgreSQL establecida correctamente.');

    // 3. Levantar el servidor HTTP
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Servidor escuchando en http://localhost:${PORT} [Modo: ${env.NODE_ENV}]`);
    });

    // Manejar cierre graceful del servidor
    const shutdown = async (signal: string) => {
      logger.warn(`⚠️ Recibida señal ${signal}. Iniciando apagado gradual...`);
      
      server.close(async () => {
        logger.info('🛑 Servidor HTTP cerrado.');
        try {
          await cacheProvider.disconnect();
          await prisma.$disconnect();
          logger.info('🛑 Conexiones de base de datos y caché finalizadas.');
          process.exit(0);
        } catch (err) {
          logger.error('❌ Error durante el cierre gradual:', err);
          process.exit(1);
        }
      });

      // Forzar cierre si no termina a tiempo (10 segundos de gracia)
      setTimeout(() => {
        logger.error('❌ Cierre gradual excedió el tiempo límite. Forzando salida.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
