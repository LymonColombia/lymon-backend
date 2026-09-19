import { PropertyRepository } from '@/domain/property/repositories/property.repository';

export function createPropertyRepositoryMock(): jest.Mocked<PropertyRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByTenantIdAndSlug: jest.fn(),
    findByTenantId: jest.fn(),
    countByTenantId: jest.fn(),
    delete: jest.fn(),
  };
}
