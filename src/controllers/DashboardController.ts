import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { IUserRepository } from '../repositories/interfaces/IUserRepository.js';
import { IRepositoryRepository } from '../repositories/interfaces/IRepositoryRepository.js';
import { IStatsRepository } from '../repositories/interfaces/IStatsRepository.js';
import { IFileRepository } from '../repositories/interfaces/IFileRepository.js';
import logger from '../utils/logger.js';

export class DashboardController {
  constructor(
    private userRepo: IUserRepository,
    private repositoryRepo: IRepositoryRepository,
    private statsRepo: IStatsRepository,
    private fileRepo: IFileRepository
  ) {}

  public githubCallback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { code } = req.query;

      if (!code) {
        res.status(400).json({
          status: 'error',
          message: 'Falta el parámetro "code" en la petición de callback.',
        });
        return;
      }

      // 1. Intercambiar code por access_token de GitHub
      logger.info('🔄 Intercambiando code por token en GitHub OAuth...');
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: env.GITHUB_CALLBACK_URL,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      const { access_token, error, error_description } = tokenResponse.data;

      if (error) {
        logger.error(`❌ Error de OAuth en GitHub: ${error} - ${error_description}`);
        res.status(400).json({ error, error_description });
        return;
      }

      if (!access_token) {
        res.status(400).json({
          status: 'error',
          message: 'No se obtuvo access_token de GitHub.',
        });
        return;
      }

      // 2. Obtener información de perfil del usuario de GitHub
      logger.info('🔄 Obteniendo perfil de usuario de GitHub...');
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'User-Agent': 'github-views-counter-app',
        },
      });

      const profile = {
        githubId: String(userResponse.data.id),
        username: userResponse.data.login,
        email: userResponse.data.email || null,
        avatarUrl: userResponse.data.avatar_url || null,
      };

      // 3. Registrar o actualizar usuario local
      const user = await this.userRepo.findOrCreateByGithub(profile);
      logger.info(`👤 Usuario logueado con éxito: ${user.username}`);

      // 4. Firmar token JWT
      const jwtToken = jwt.sign(
        { id: user.id, username: user.username },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        status: 'success',
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (err) {
      logger.error('❌ Error en githubCallback:', err);
      next(err);
    }
  };

  public getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'No autorizado.' });
        return;
      }

      const user = await this.userRepo.findById(userId);
      if (!user) {
        res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        return;
      }

      res.status(200).json({ status: 'success', user });
    } catch (err) {
      next(err);
    }
  };

  public getRepositories = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'No autorizado.' });
        return;
      }

      const repos = await this.repositoryRepo.findAllByUserId(userId);
      res.status(200).json({ status: 'success', repositories: repos });
    } catch (err) {
      next(err);
    }
  };

  public claimRepository = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { owner, name } = req.body;

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'No autorizado.' });
        return;
      }

      if (!owner || !name) {
        res.status(400).json({
          status: 'error',
          message: 'Faltan parámetros obligatorios en el body: owner y name.',
        });
        return;
      }

      // Validar si el repositorio existe en GitHub
      try {
        await axios.get(`https://api.github.com/repos/${owner}/${name}`, {
          headers: { 'User-Agent': 'github-views-counter-app' },
        });
      } catch (err) {
        logger.warn(`🔍 Repositorio no encontrado o privado en GitHub: ${owner}/${name}`);
        res.status(404).json({
          status: 'error',
          message: `El repositorio público '${owner}/${name}' no existe en GitHub.`,
        });
        return;
      }

      // Vincular repositorio al usuario
      const claimedRepo = await this.repositoryRepo.claim(owner, name, userId);
      logger.info(`🎉 Repositorio reclamado: ${owner}/${name} por ${req.user?.username}`);

      res.status(200).json({ status: 'success', repository: claimedRepo });
    } catch (err) {
      next(err);
    }
  };

  public getRepositoryStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const repoId = req.params.id;

      if (!userId) {
        res.status(401).json({ status: 'error', message: 'No autorizado.' });
        return;
      }

      const repo = await this.repositoryRepo.findById(repoId);
      if (!repo || repo.userId !== userId) {
        res.status(403).json({
          status: 'error',
          message: 'Acceso denegado o repositorio inexistente.',
        });
        return;
      }

      // Obtener resumen general y lista de archivos
      const summary = await this.statsRepo.getDashboardSummary(userId);
      const files = await this.fileRepo.findAllByRepositoryId(repoId);

      res.status(200).json({
        status: 'success',
        repository: repo,
        files: files.map((f) => ({
          id: f.id,
          path: f.path,
          totalViews: f.stats?.totalViews ?? 0,
          uniqueViews: f.stats?.uniqueViews ?? 0,
        })),
        summary,
      });
    } catch (err) {
      next(err);
    }
  };
}
