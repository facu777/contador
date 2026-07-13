import app from '../app.js';
import prisma from '../config/prisma.js';
import { CacheProviderFactory } from '../services/cache/CacheProviderFactory.js';
import logger from '../utils/logger.js';
import http from 'http';

const PORT = 3001;
let server: http.Server;

// Función auxiliar para realizar peticiones HTTP locales
async function request(path: string, headers: Record<string, string> = {}): Promise<{ status: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: 'localhost',
        port: PORT,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function runTests() {
  logger.info('🧪 Iniciando pruebas de integración...');

  // 1. Limpiar base de datos de pruebas previas
  await prisma.$connect();
  const testOwner = 'testowner';
  const testRepo = 'testrepo';
  const testPath = 'README.md';

  await prisma.repository.deleteMany({
    where: { owner: testOwner },
  });
  logger.info('🧹 Base de datos limpia de registros de prueba.');

  // 2. Levantar el servidor de prueba en puerto 3001
  server = app.listen(PORT, async () => {
    logger.info(`🚀 Servidor de pruebas escuchando en puerto ${PORT}`);

    try {
      // PRUEBA 1: Verificar Health Check
      const healthRes = await request('/health');
      if (healthRes.status !== 200) throw new Error('Falló el health check');
      logger.info('✅ Prueba 1 superada: Health Check OK');

      // PRUEBA 2: Cargar badge SVG por primera vez
      const firstRes = await request(`/github/${testOwner}/${testRepo}/${testPath}.svg`, {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0)',
      });

      if (firstRes.status !== 200) {
        throw new Error(`Falló al obtener SVG inicial, código: ${firstRes.status}`);
      }

      if (!firstRes.headers['content-type']?.startsWith('image/svg+xml')) {
        throw new Error(`Content-Type inválido: ${firstRes.headers['content-type']}`);
      }

      if (!firstRes.body.includes('<svg') || !firstRes.body.includes('views') || !firstRes.body.includes('1')) {
        throw new Error(`Contenido del SVG inválido: ${firstRes.body}`);
      }

      // Verificar cabeceras de anulación de caché
      if (
        firstRes.headers['cache-control'] !== 'no-cache, no-store, must-revalidate, private' ||
        firstRes.headers['pragma'] !== 'no-cache'
      ) {
        throw new Error('Las cabeceras de caché no son correctas.');
      }
      logger.info('✅ Prueba 2 superada: Badge cargado por primera vez con contador en 1, Content-Type y Cache Headers correctos.');

      // PRUEBA 3: Visita duplicada constante (segunda vez consecutiva desde la misma IP y UA)
      const secondRes = await request(`/github/${testOwner}/${testRepo}/${testPath}.svg`, {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0)',
      });

      if (!secondRes.body.includes('1')) {
        throw new Error('El contador se incrementó en una recarga rápida. La caché anti-inflado falló.');
      }
      logger.info('✅ Prueba 3 superada: Visita recurrente detectada y prevenida. El contador se mantiene en 1.');

      // PRUEBA 4: Visita única (misma IP pero diferente User Agent)
      const thirdRes = await request(`/github/${testOwner}/${testRepo}/${testPath}.svg`, {
        'user-agent': 'Different User-Agent Chrome/120',
      });

      if (!thirdRes.body.includes('2')) {
        throw new Error(`El contador no se incrementó para un User-Agent diferente. Recibido: ${thirdRes.body}`);
      }
      logger.info('✅ Prueba 4 superada: Visita única desde diferente User Agent incrementó el contador a 2.');

      // 3. Apagar servidor y salir exitosamente
      cleanup(0);

    } catch (error: any) {
      logger.error(`❌ Error durante la verificación: ${error.message}`);
      cleanup(1);
    }
  });
}

function cleanup(exitCode: number) {
  if (server) {
    server.close(async () => {
      await CacheProviderFactory.getProvider().disconnect();
      await prisma.$disconnect();
      logger.info('🛑 Servidor de pruebas cerrado.');
      process.exit(exitCode);
    });
  } else {
    process.exit(exitCode);
  }
}

runTests();
