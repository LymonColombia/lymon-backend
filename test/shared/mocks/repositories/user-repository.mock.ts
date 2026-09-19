import { UserRepository } from '@/domain/user/repositories/user.repository';

export function createUserRepositoryMock(): jest.Mocked<UserRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByTenantId: jest.fn(),
    findByEmailAndTenantId: jest.fn(),
    findByResetToken: jest.fn(),
  };
}
