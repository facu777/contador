import { Stats } from '@prisma/client';

export interface IncrementDetails {
  ipHash: string;
  userAgent: string;
  referer: string | null;
  country: string | null;
}

export interface StatsRepository {
  // Incrementar visitas e insertar logs y agregados en una transacción atómica
  incrementViews(
    fileId: string,
    isUnique: boolean,
    details?: IncrementDetails
  ): Promise<Stats>;

  // Obtener estadísticas agregadas para el dashboard
  getDashboardSummary(userId: string): Promise<{
    totalViews: number;
    uniqueViews: number;
    todayViews: number;
    viewsHistory: Array<{ date: string; views: number; uniqueViews: number }>;
    countryStats: Array<{ country: string; count: number }>;
  }>;
}
export interface IStatsRepository extends StatsRepository {}
