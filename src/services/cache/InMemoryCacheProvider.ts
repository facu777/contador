import { ICacheProvider } from './ICacheProvider.js';
import logger from '../../utils/logger.js';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class InMemoryCacheProvider implements ICacheProvider {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval?: NodeJS.Timeout;
  private maxItems = 100000; // Límite de tamaño para evitar fugas de memoria

  constructor() {
    // Limpieza periódica de claves expiradas cada 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  public async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  public async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    // Si superamos el tamaño máximo, eliminamos el primer elemento (FIFO simple)
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  public async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  public async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  public async connect(): Promise<void> {
    logger.info('🔌 Caché en Memoria conectada y activa.');
  }

  public async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    logger.info('🔌 Caché en Memoria desconectada.');
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let deletedCount = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      logger.debug(`🧹 Limpieza de caché en memoria: se eliminaron ${deletedCount} claves expiradas.`);
    }
  }
}
