import { NotFoundException } from '@nestjs/common';
import { GetItemsBySupplierQueryHandler } from '@/application/inventory/queries/get-items-by-supplier/get-items-by-supplier.query-handler';
import { GetItemsBySupplierQuery } from '@/application/inventory/queries/get-items-by-supplier/get-items-by-supplier.query';
import { InventoryItemRepository } from '@/domain/inventory/repositories/inventory-item.repository';
import { SupplierRepository } from '@/domain/inventory/repositories/supplier.repository';
import { createInventoryItemRepositoryMock } from '@test/shared/mocks/repositories/inventory-item-repository.mock';
import { createSupplierRepositoryMock } from '@test/shared/mocks/repositories/supplier-repository.mock';
import { makeInventoryItem } from '@test/shared/fixtures/inventory-item.fixture';
import { makeSupplier } from '@test/shared/fixtures/supplier.fixture';

describe('GetItemsBySupplierQueryHandler', () => {
  let handler: GetItemsBySupplierQueryHandler;
  let inventoryItemRepository: jest.Mocked<InventoryItemRepository>;
  let supplierRepository: jest.Mocked<SupplierRepository>;

  beforeEach(() => {
    inventoryItemRepository = createInventoryItemRepositoryMock();
    supplierRepository = createSupplierRepositoryMock();

    handler = new GetItemsBySupplierQueryHandler(
      inventoryItemRepository,
      supplierRepository,
    );
  });

  it('returns items for the supplier with pagination metadata', async () => {
    supplierRepository.findById.mockResolvedValue(
      makeSupplier({
        id: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
        tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      }),
    );
    inventoryItemRepository.findBySupplierId.mockResolvedValue([
      makeInventoryItem({
        id: 'item-1',
        tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        supplierId: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
      }),
      makeInventoryItem({
        id: 'item-2',
        tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        supplierId: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
      }),
    ]);

    const result = await handler.execute(
      new GetItemsBySupplierQuery(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
        1,
        10,
      ),
    );

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(inventoryItemRepository.findBySupplierId).toHaveBeenCalledWith(
      expect.objectContaining({ toString: expect.any(Function) }),
      expect.objectContaining({ toString: expect.any(Function) }),
    );
  });

  it('throws NotFoundException when the supplier does not exist', async () => {
    supplierRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new GetItemsBySupplierQuery(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
          1,
          10,
        ),
      ),
    ).rejects.toThrow(NotFoundException);

    expect(inventoryItemRepository.findBySupplierId).not.toHaveBeenCalled();
  });
});
