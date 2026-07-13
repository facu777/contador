import { Repository } from '@prisma/client';
import { IRepositoryRepository } from '../interfaces/IRepositoryRepository.js';
import prisma from '../../config/prisma.js';

export class PrismaRepositoryRepository implements IRepositoryRepository {
  public async findByOwnerAndName(owner: string, name: string): Promise<Repository | null> {
    return prisma.repository.findFirst({
      where: {
        owner,
        name,
      },
    });
  }

  public async findOrCreate(owner: string, name: string): Promise<Repository> {
    const fullName = `${owner}/${name}`;
    return prisma.repository.upsert({
      where: { fullName },
      update: {},
      create: {
        owner,
        name,
        fullName,
      },
    });
  }

  public async claim(owner: string, name: string, userId: string): Promise<Repository> {
    const fullName = `${owner}/${name}`;
    return prisma.repository.upsert({
      where: { fullName },
      update: { userId },
      create: {
        owner,
        name,
        fullName,
        userId,
      },
    });
  }

  public async findAllByUserId(userId: string): Promise<Repository[]> {
    return prisma.repository.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  public async findById(id: string): Promise<Repository | null> {
    return prisma.repository.findUnique({
      where: { id },
    });
  }
}
