import { Stats } from '@prisma/client';
import { IStatsRepository, IncrementDetails } from '../interfaces/IStatsRepository.js';
import prisma from '../../config/prisma.js';

export class PrismaStatsRepository implements IStatsRepository {
  public async incrementViews(
    fileId: string,
    isUnique: boolean,
    details?: IncrementDetails
  ): Promise<Stats> {
    return prisma.$transaction(async (tx) => {
      // 1. Incrementar el contador global
      const stats = await tx.stats.upsert({
        where: { fileId },
        update: {
          totalViews: { increment: 1 },
          uniqueViews: isUnique ? { increment: 1 } : undefined,
        },
        create: {
          fileId,
          totalViews: 1,
          uniqueViews: isUnique ? 1 : 0,
        },
      });

      // Si no hay detalles de registro, es una llamada simplificada
      if (!details) {
        return stats;
      }

      // 2. Crear el log de la visita
      await tx.visitLog.create({
        data: {
          fileId,
          ipHash: details.ipHash,
          userAgent: details.userAgent,
          referer: details.referer,
          country: details.country,
        },
      });

      // Calcular fechas para estadísticas agregadas
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-indexed para bases de datos

      // 3. Incrementar/Crear DailyStats
      await tx.dailyStats.upsert({
        where: {
          fileId_date: {
            fileId,
            date: today,
          },
        },
        update: {
          views: { increment: 1 },
          uniqueViews: isUnique ? { increment: 1 } : undefined,
        },
        create: {
          fileId,
          date: today,
          views: 1,
          uniqueViews: isUnique ? 1 : 0,
        },
      });

      // 4. Incrementar/Crear MonthlyStats
      await tx.monthlyStats.upsert({
        where: {
          fileId_year_month: {
            fileId,
            year: currentYear,
            month: currentMonth,
          },
        },
        update: {
          views: { increment: 1 },
          uniqueViews: isUnique ? { increment: 1 } : undefined,
        },
        create: {
          fileId,
          year: currentYear,
          month: currentMonth,
          views: 1,
          uniqueViews: isUnique ? 1 : 0,
        },
      });

      return stats;
    });
  }

  public async getDashboardSummary(userId: string): Promise<{
    totalViews: number;
    uniqueViews: number;
    todayViews: number;
    viewsHistory: Array<{ date: string; views: number; uniqueViews: number }>;
    countryStats: Array<{ country: string; count: number }>;
  }> {
    // 1. Obtener la suma global de vistas
    const viewsSum = await prisma.stats.aggregate({
      where: {
        file: {
          repository: {
            userId,
          },
        },
      },
      _sum: {
        totalViews: true,
        uniqueViews: true,
      },
    });

    // 2. Obtener las vistas de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await prisma.visitLog.count({
      where: {
        file: {
          repository: {
            userId,
          },
        },
        timestamp: {
          gte: today,
        },
      },
    });

    // 3. Obtener historial de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dailyData = await prisma.dailyStats.groupBy({
      by: ['date'],
      where: {
        file: {
          repository: {
            userId,
          },
        },
        date: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        views: true,
        uniqueViews: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const viewsHistory = dailyData.map((d) => ({
      date: d.date.toISOString().split('T')[0],
      views: d._sum.views ?? 0,
      uniqueViews: d._sum.uniqueViews ?? 0,
    }));

    // 4. Obtener agregación por países
    const countryData = await prisma.visitLog.groupBy({
      by: ['country'],
      where: {
        file: {
          repository: {
            userId,
          },
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    const countryStats = countryData.map((c) => ({
      country: c.country ?? 'Desconocido',
      count: c._count.id,
    }));

    return {
      totalViews: viewsSum._sum.totalViews ?? 0,
      uniqueViews: viewsSum._sum.uniqueViews ?? 0,
      todayViews: todayCount,
      viewsHistory,
      countryStats,
    };
  }
}
