import { InventoryItemCategoryRepository } from '@/domain/inventory/repositories/inventory-item-category.repository';

export function createInventoryItemCategoryRepositoryMock(): jest.Mocked<InventoryItemCategoryRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findByTenantId: jest.fn(),
  };
}
