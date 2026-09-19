import { GuestRepository } from '@/domain/guest/repositories/guest.repository';

export function createGuestRepositoryMock(): jest.Mocked<GuestRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByTenantId: jest.fn(),
    findByPrimaryEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findByGuestAccountId: jest.fn(),
    findAllByGuestAccountId: jest.fn(),
    countByTenantId: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    findByTenantIdPaginated: jest.fn(),
    searchPaginated: jest.fn(),
  };
}
