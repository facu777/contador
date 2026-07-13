import crypto from 'crypto';
import { IRepositoryRepository } from '../repositories/interfaces/IRepositoryRepository.js';
import { IFileRepository } from '../repositories/interfaces/IFileRepository.js';
import { IStatsRepository } from '../repositories/interfaces/IStatsRepository.js';
import { ICacheProvider } from './cache/ICacheProvider.js';
import logger from '../utils/logger.js';

export class ViewsService {
  constructor(
    private repositoryRepo: IRepositoryRepository,
    private fileRepo: IFileRepository,
    private statsRepo: IStatsRepository,
    private cacheProvider: ICacheProvider
  ) {}

  public async registerHit(
    owner: string,
    repoName: string,
    filePath: string,
    ip: string,
    userAgent: string,
    referer: string | null,
    country: string | null,
    ttlSeconds: number
  ): Promise<{ totalViews: number; uniqueViews: number; isUnique: boolean }> {
    // 1. Obtener o crear repositorio
    const repo = await this.repositoryRepo.findOrCreate(owner, repoName);

    // 2. Obtener o crear archivo asociado al repositorio
    const file = await this.fileRepo.findOrCreate(repo.id, filePath);

    // 3. Generar hash único del visitante (IP + UA + FileID)
    const hashInput = `${ip}:${userAgent}:${file.id}`;
    const ipHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    // 4. Comprobar bloqueo en caché para evitar doble conteo
    const cacheKey = `view_lock:${ipHash}`;
    const isLocked = await this.cacheProvider.exists(cacheKey);

    if (isLocked) {
      logger.debug(`🔒 Visita duplicada detectada (Caché bloqueada) para el archivo ${filePath} de ${owner}/${repoName}`);
      return {
        totalViews: file.stats?.totalViews ?? 0,
        uniqueViews: file.stats?.uniqueViews ?? 0,
        isUnique: false,
      };
    }

    // 5. Es una visita única. Registrar y actualizar estadísticas de forma atómica en BD
    logger.info(`📈 Nueva visita única registrada para ${owner}/${repoName}/${filePath}`);
    
    // Configurar bloqueo en caché
    await this.cacheProvider.set(cacheKey, '1', ttlSeconds);

    const updatedStats = await this.statsRepo.incrementViews(
      file.id,
      true, // es visita única desde la perspectiva de la caché
      {
        ipHash,
        userAgent,
        referer,
        country,
      }
    );

    return {
      totalViews: updatedStats.totalViews,
      uniqueViews: updatedStats.uniqueViews,
      isUnique: true,
    };
  }
}
