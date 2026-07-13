import { User } from '@prisma/client';
import { IUserRepository } from '../interfaces/IUserRepository.js';
import prisma from '../../config/prisma.js';

export class PrismaUserRepository implements IUserRepository {
  public async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  public async findByGithubId(githubId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { githubId },
    });
  }

  public async findOrCreateByGithub(profile: {
    githubId: string;
    username: string;
    email?: string | null;
    avatarUrl?: string | null;
  }): Promise<User> {
    return prisma.user.upsert({
      where: { githubId: profile.githubId },
      update: {
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      },
      create: {
        githubId: profile.githubId,
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      },
    });
  }
}
