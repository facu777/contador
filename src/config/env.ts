import dotenv from 'dotenv';
import { z } from 'zod';

// Cargar variables del archivo .env
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(8),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_CALLBACK_URL: z.string().url(),
  CACHE_TTL_SECONDS: z.coerce.number().default(86400), // 24 horas por defecto
});

// Validar variables de entorno de forma estricta
let parsedEnv: Env;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error: any) {
  console.error('❌ Error de configuración en las variables de entorno:');
  if (error.format) {
    console.error(JSON.stringify(error.format(), null, 2));
  } else {
    console.error(error);
  }
  process.exit(1);
}

export const env = parsedEnv;
export type Env = z.infer<typeof envSchema>;
