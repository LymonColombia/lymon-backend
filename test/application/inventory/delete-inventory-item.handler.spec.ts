import { NotFoundException } from '@nestjs/common';
import { DeleteInventoryItemHandler } from '@/application/inventory/commands/delete-inventory-item/delete-inventory-item.handler';
import { DeleteInventoryItemCommand } from '@/application/inventory/commands/delete-inventory-item/delete-inventory-item.command';
import { InventoryItemRepository } from '@/domain/inventory/repositories/inventory-item.repository';
import { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { createInventoryItemRepositoryMock } from '@test/shared/mocks/repositories/inventory-item-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { makeProperty } from '@test/shared/fixtures/property.fixture';
import {
  INVENTORY_ITEM_FIXTURE_DEFAULTS,
  makeInventoryItem,
} from '@test/shared/fixtures/inventory-item.fixture';

describe('DeleteInventoryItemHandler', () => {
  let handler: DeleteInventoryItemHandler;
  let inventoryItemRepository: jest.Mocked<InventoryItemRepository>;
  let propertyRepository: jest.Mocked<PropertyRepository>;

  beforeEach(() => {
    inventoryItemRepository = createInventoryItemRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();

    handler = new DeleteInventoryItemHandler(
      inventoryItemRepository,
      propertyRepository,
    );
  });

  describe('when property does not exist', () => {
    it('throws NotFoundException', async () => {
      propertyRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(
          new DeleteInventoryItemCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            INVENTORY_ITEM_FIXTURE_DEFAULTS.id,
          ),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(inventoryItemRepository.findById).not.toHaveBeenCalled();
      expect(inventoryItemRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when property belongs to a different tenant', () => {
    it('throws NotFoundException', async () => {
      propertyRepository.findById.mockResolvedValue(
        makeProperty({ tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000' }),
      );

      await expect(
        handler.execute(
          new DeleteInventoryItemCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            INVENTORY_ITEM_FIXTURE_DEFAULTS.id,
          ),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(inventoryItemRepository.findById).not.toHaveBeenCalled();
      expect(inventoryItemRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when inventory item does not exist', () => {
    it('throws NotFoundException', async () => {
      propertyRepository.findById.mockResolvedValue(makeProperty());
      inventoryItemRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(
          new DeleteInventoryItemCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            INVENTORY_ITEM_FIXTURE_DEFAULTS.id,
          ),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(inventoryItemRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when inventory item belongs to another tenant', () => {
    it('throws NotFoundException', async () => {
      propertyRepository.findById.mockResolvedValue(makeProperty());
      inventoryItemRepository.findById.mockResolvedValue(
        makeInventoryItem({ tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000' }),
      );

      await expect(
        handler.execute(
          new DeleteInventoryItemCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            INVENTORY_ITEM_FIXTURE_DEFAULTS.id,
          ),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(inventoryItemRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when inventory item belongs to another property', () => {
    it('throws NotFoundException', async () => {
      propertyRepository.findById.mockResolvedValue(makeProperty());
      inventoryItemRepository.findById.mockResolvedValue(
        makeInventoryItem({ propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9ca00000000' }),
      );

      await expect(
        handler.execute(
          new DeleteInventoryItemCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            INVENTORY_ITEM_FIXTURE_DEFAULTS.id,
          ),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(inventoryItemRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when all validations pass', () => {
    it('deletes inventory item successfully', async () => {
      propertyRepository.findById.mockResolvedValue(makeProperty());
      inventoryItemRepository.findById.mockResolvedValue(makeInventoryItem());

      await expect(
        handler.execute(
          new DeleteInventoryItemCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            INVENTORY_ITEM_FIXTURE_DEFAULTS.id,
          ),
        ),
      ).resolves.toBeUndefined();

      expect(inventoryItemRepository.delete).toHaveBeenCalledTimes(1);
      expect(inventoryItemRepository.delete).toHaveBeenCalledWith(
        expect.objectContaining({}),
      );
    });
  });
});
