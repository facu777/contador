import { File, Stats } from '@prisma/client';

export type FileWithStats = File & { stats: Stats | null };

export interface IFileRepository {
  findByPath(repositoryId: string, path: string): Promise<FileWithStats | null>;
  findOrCreate(repositoryId: string, path: string): Promise<FileWithStats>;
  findAllByRepositoryId(repositoryId: string): Promise<FileWithStats[]>;
  getMostVisited(userId: string, limit: number): Promise<Array<{
    path: string;
    repoName: string;
    totalViews: number;
    uniqueViews: number;
  }>>;
}
