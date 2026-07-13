import { Router } from 'express';
import { ViewsController } from '../controllers/ViewsController.js';
import { ViewsService } from '../services/ViewsService.js';
import { PrismaRepositoryRepository } from '../repositories/prisma/PrismaRepositoryRepository.js';
import { PrismaFileRepository } from '../repositories/prisma/PrismaFileRepository.js';
import { PrismaStatsRepository } from '../repositories/prisma/PrismaStatsRepository.js';
import { CacheProviderFactory } from '../services/cache/CacheProviderFactory.js';
import { svgLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Instanciar dependencias inyectables
const repositoryRepo = new PrismaRepositoryRepository();
const fileRepo = new PrismaFileRepository();
const statsRepo = new PrismaStatsRepository();
const cacheProvider = CacheProviderFactory.getProvider();

const viewsService = new ViewsService(repositoryRepo, fileRepo, statsRepo, cacheProvider);
const viewsController = new ViewsController(viewsService);

// Expresión regular en el wildcard '*' para capturar subdirectorios y archivos que finalizan en .svg
// Ejemplo: /github/owner/repo/docs/guide.md.svg
router.get('/github/:owner/:repo/*', svgLimiter, viewsController.registerHit);

export default router;
