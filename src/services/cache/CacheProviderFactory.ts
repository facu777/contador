import { ICacheProvider } from './ICacheProvider.js';
import { InMemoryCacheProvider } from './InMemoryCacheProvider.js';
import { RedisCacheProvider } from './RedisCacheProvider.js';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';

export class CacheProviderFactory {
  private static instance: ICacheProvider;

  public static getProvider(): ICacheProvider {
    if (!this.instance) {
      if (env.REDIS_URL) {
        logger.info('⚙️ Inicializando proveedor de caché: Redis');
        this.instance = new RedisCacheProvider(env.REDIS_URL);
      } else {
        logger.info('⚙️ Inicializando proveedor de caché: En Memoria (Fallback)');
        this.instance = new InMemoryCacheProvider();
      }
    }
    return this.instance;
  }
}
