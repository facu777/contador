import { User } from '@prisma/client';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByGithubId(githubId: string): Promise<User | null>;
  findOrCreateByGithub(profile: {
    githubId: string;
    username: string;
    email?: string | null;
    avatarUrl?: string | null;
  }): Promise<User>;
}
