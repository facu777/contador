import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { PrismaUserRepository } from '../repositories/prisma/PrismaUserRepository.js';
import { PrismaRepositoryRepository } from '../repositories/prisma/PrismaRepositoryRepository.js';
import { PrismaStatsRepository } from '../repositories/prisma/PrismaStatsRepository.js';
import { PrismaFileRepository } from '../repositories/prisma/PrismaFileRepository.js';
import { authenticate } from '../middlewares/auth.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Instanciar dependencias
const userRepo = new PrismaUserRepository();
const repositoryRepo = new PrismaRepositoryRepository();
const statsRepo = new PrismaStatsRepository();
const fileRepo = new PrismaFileRepository();

const dashboardController = new DashboardController(
  userRepo,
  repositoryRepo,
  statsRepo,
  fileRepo
);

// Ruta pública para OAuth Callback
router.get('/api/auth/github/callback', apiLimiter, dashboardController.githubCallback);

// Rutas protegidas para el Dashboard
router.get('/api/user/profile', apiLimiter, authenticate, dashboardController.getProfile);
router.get('/api/repositories', apiLimiter, authenticate, dashboardController.getRepositories);
router.post('/api/repositories/claim', apiLimiter, authenticate, dashboardController.claimRepository);
router.get('/api/repositories/:id/stats', apiLimiter, authenticate, dashboardController.getRepositoryStats);

export default router;
