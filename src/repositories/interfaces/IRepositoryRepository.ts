import { Repository } from '@prisma/client';

export interface IRepositoryRepository {
  findByOwnerAndName(owner: string, name: string): Promise<Repository | null>;
  findOrCreate(owner: string, name: string): Promise<Repository>;
  claim(owner: string, name: string, userId: string): Promise<Repository>;
  findAllByUserId(userId: string): Promise<Repository[]>;
  findById(id: string): Promise<Repository | null>;
}
