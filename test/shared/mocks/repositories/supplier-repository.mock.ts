import { SupplierRepository } from '@/domain/inventory/repositories/supplier.repository';

export function createSupplierRepositoryMock(): jest.Mocked<SupplierRepository> {
  return {
    save: jest.fn(),
    findByTenantId: jest.fn(),
    findById: jest.fn(),
    findByNit: jest.fn(),
    delete: jest.fn(),
  };
}
