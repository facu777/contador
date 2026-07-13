import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  // Registrar error con Winston
  logger.error(`[HTTP Error] ${req.method} ${req.url} - Status ${statusCode} - Error: ${message}`, {
    stack: err.stack,
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message || 'Error interno del servidor',
  });
};
