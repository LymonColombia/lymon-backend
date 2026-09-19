import { GuestTagRepository } from '@/domain/guest-tag/repositories/guest-tag.repository';

export function createGuestTagRepositoryMock(): jest.Mocked<GuestTagRepository> {
  return {
    save: jest.fn(),
    findAll: jest.fn(),
    findByNames: jest.fn(),
    existsByTenantIdAndName: jest.fn(),
  };
}
