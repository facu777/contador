import rateLimit from 'express-rate-limit';

// Limitador de tasa de peticiones para los badges SVG
export const svgLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 120, // Máximo 120 solicitudes por IP
  standardHeaders: true, // Retornar cabeceras estándar de rate limit (RateLimit-Limit, RateLimit-Remaining)
  legacyHeaders: false, // Desactivar cabeceras X-RateLimit-*
  message: {
    status: 'error',
    message: 'Demasiadas peticiones. Has excedido la tasa de solicitudes de badges.',
  },
});

// Limitador de tasa de peticiones para la API del Dashboard
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // Máximo 60 solicitudes por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Demasiadas peticiones. Has excedido la tasa de solicitudes a la API.',
  },
});
