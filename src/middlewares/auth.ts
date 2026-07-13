import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

// Extender la interfaz Request de Express globalmente para incluir req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
    }
  }
}

export interface UserPayload {
  id: string;
  username: string;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'No autorizado. Cabecera Authorization no provista o inválida.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    req.user = {
      id: decoded.id,
      username: decoded.username,
    };
    next();
  } catch (error) {
    logger.warn(`🔑 Intento de acceso fallido con token inválido: ${token}`);
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Token expirado o inválido.',
    });
  }
};
