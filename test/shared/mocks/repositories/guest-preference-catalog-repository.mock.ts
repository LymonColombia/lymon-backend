import { GuestPreferenceCatalogRepository } from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';

export function createGuestPreferenceCatalogRepositoryMock(): jest.Mocked<GuestPreferenceCatalogRepository> {
  return {
    save: jest.fn(),
    findByTenant: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
  };
}
