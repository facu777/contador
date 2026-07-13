import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import viewsRouter from './routes/views.js';
import dashboardRouter from './routes/dashboard.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Middlewares de seguridad y utilidad
app.use(helmet({
  contentSecurityPolicy: false, // Desactivar CSP temporalmente si afecta renderizado de SVG remoto
}));
app.use(cors());
app.use(express.json());

// Ruta de comprobación de salud (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Rutas principales
app.use(viewsRouter);
app.use(dashboardRouter);

// Manejador centralizado de errores
app.use(errorHandler);

export default app;
