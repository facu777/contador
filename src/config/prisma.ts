import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

// Registrar logs de consulta en modo desarrollo
prisma.$on('query', (e) => {
  logger.debug(`Prisma Query: ${e.query} -- Params: ${e.params} -- Duration: ${e.duration}ms`);
});

export default prisma;
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
