import { FileWithStats, IFileRepository } from '../interfaces/IFileRepository.js';
import prisma from '../../config/prisma.js';

export class PrismaFileRepository implements IFileRepository {
  public async findByPath(repositoryId: string, path: string): Promise<FileWithStats | null> {
    return prisma.file.findUnique({
      where: {
        repositoryId_path: {
          repositoryId,
          path,
        },
      },
      include: {
        stats: true,
      },
    });
  }

  public async findOrCreate(repositoryId: string, path: string): Promise<FileWithStats> {
    // Buscar primero para evitar fallos de concurrencia en upsert si es posible
    const existing = await this.findByPath(repositoryId, path);
    if (existing) return existing;

    try {
      return await prisma.file.create({
        data: {
          repositoryId,
          path,
          stats: {
            create: {
              totalViews: 0,
              uniqueViews: 0,
            },
          },
        },
        include: {
          stats: true,
        },
      });
    } catch (e) {
      // Si falla por restricción única (concurrencia), buscar de nuevo
      const found = await this.findByPath(repositoryId, path);
      if (found) return found;
      throw e;
    }
  }

  public async findAllByRepositoryId(repositoryId: string): Promise<FileWithStats[]> {
    return prisma.file.findMany({
      where: { repositoryId },
      include: { stats: true },
      orderBy: { path: 'asc' },
    });
  }

  public async getMostVisited(
    userId: string,
    limit: number
  ): Promise<Array<{
    path: string;
    repoName: string;
    totalViews: number;
    uniqueViews: number;
  }>> {
    const files = await prisma.file.findMany({
      where: {
        repository: {
          userId,
        },
      },
      include: {
        repository: true,
        stats: true,
      },
      orderBy: {
        stats: {
          totalViews: 'desc',
        },
      },
      take: limit,
    });

    return files.map((file) => ({
      path: file.path,
      repoName: file.repository.fullName,
      totalViews: file.stats?.totalViews ?? 0,
      uniqueViews: file.stats?.uniqueViews ?? 0,
    }));
  }
}
