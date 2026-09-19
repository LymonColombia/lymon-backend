import { UnitRepository } from '@/domain/unit/repositories/unit.repository';

export function createUnitRepositoryMock(): jest.Mocked<UnitRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByPropertyId: jest.fn(),
    findByTenantId: jest.fn(),
    countByTenantId: jest.fn(),
    delete: jest.fn(),
    findByTenantIdPaginated: jest.fn(),
    findAllPaginated: jest.fn(),
    findByIds: jest.fn(),
  };
}
