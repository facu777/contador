import { createClient } from 'redis';
import { ICacheProvider } from './ICacheProvider.js';
import logger from '../../utils/logger.js';

export class RedisCacheProvider implements ICacheProvider {
  private client: ReturnType<typeof createClient>;
  private isConnected = false;

  constructor(url: string) {
    this.client = createClient({ url });

    this.client.on('error', (err: any) => {
      logger.error('❌ Error de conexión en Redis client:', err);
    });

    this.client.on('connect', () => {
      logger.info('🔌 Intentando conectar a Redis...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('🔌 Conexión con Redis establecida correctamente.');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('🔌 Conexión con Redis finalizada.');
    });
  }

  public async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    return this.client.get(key);
  }

  public async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.isConnected) return;
    await this.client.set(key, value, {
      EX: ttlSeconds,
    });
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;
    const count = await this.client.exists(key);
    return count > 0;
  }

  public async delete(key: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(key);
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('❌ Error al intentar conectar con Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }
}
