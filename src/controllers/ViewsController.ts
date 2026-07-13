import { Request, Response, NextFunction } from 'express';
import { ViewsService } from '../services/ViewsService.js';
import { BadgeGenerator } from '../utils/BadgeGenerator.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export class ViewsController {
  constructor(private viewsService: ViewsService) {}

  public registerHit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { owner, repo } = req.params;
      const fullPath = req.params[0] || '';

      if (!owner || !repo || !fullPath) {
        res.status(400).send('Faltan parámetros obligatorios (owner, repo, filePath).');
        return;
      }

      // Quitar la extensión .svg final si existe (e.g. docs/README.md.svg -> docs/README.md)
      const filePath = fullPath.replace(/\.svg$/, '');

      // Obtener IP del cliente (considerando proxies/Camo)
      const xForwardedFor = req.headers['x-forwarded-for'] as string;
      const ip = xForwardedFor ? xForwardedFor.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';

      const userAgent = req.headers['user-agent'] || 'Unknown';
      const referer = req.headers['referer'] || null;

      // Obtener el código de país (de Cloudflare, si estuviera habilitado, o null)
      const country = (req.headers['cf-ipcountry'] as string) || null;

      // Obtener opciones de personalización desde Query Params
      const color = (req.query.color as string) || 'blue';
      const style = (req.query.style as 'flat' | 'flat-square') || 'flat';
      const label = (req.query.label as string) || 'views';

      // Registrar visita
      const result = await this.viewsService.registerHit(
        owner,
        repo,
        filePath,
        ip,
        userAgent,
        referer,
        country,
        env.CACHE_TTL_SECONDS
      );

      // Formatear visitas con separador de miles
      const formattedValue = result.totalViews.toLocaleString();

      // Generar el SVG dinámico
      const svg = BadgeGenerator.generate({
        label,
        value: formattedValue,
        color,
        style,
      });

      // Configurar cabeceras estrictas contra la caché de GitHub Camo
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).send(svg);
    } catch (error) {
      logger.error('❌ Error en ViewsController:', error);
      next(error);
    }
  };
}
