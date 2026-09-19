import { InventoryItemRepository } from '@/domain/inventory/repositories/inventory-item.repository';

export function createInventoryItemRepositoryMock(): jest.Mocked<InventoryItemRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByPropertyId: jest.fn(),
    findLowStockByPropertyId: jest.fn(),
    findByPropertyIdAndSku: jest.fn(),
    findBySupplierId: jest.fn(),
    delete: jest.fn(),
  };
}
