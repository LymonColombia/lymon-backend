import { NotFoundException } from '@nestjs/common';
import { DeleteSupplierHandler } from '@/application/inventory/commands/delete-supplier/delete-supplier.handler';
import { DeleteSupplierCommand } from '@/application/inventory/commands/delete-supplier/delete-supplier.command';
import { SupplierRepository } from '@/domain/inventory/repositories/supplier.repository';
import { InventoryItemRepository } from '@/domain/inventory/repositories/inventory-item.repository';
import { createSupplierRepositoryMock } from '@test/shared/mocks/repositories/supplier-repository.mock';
import { createInventoryItemRepositoryMock } from '@test/shared/mocks/repositories/inventory-item-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { makeSupplier } from '@test/shared/fixtures/supplier.fixture';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

describe('DeleteSupplierHandler', () => {
  let handler: DeleteSupplierHandler;
  let supplierRepository: jest.Mocked<SupplierRepository>;
  let inventoryItemRepository: jest.Mocked<InventoryItemRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    supplierRepository = createSupplierRepositoryMock();
    inventoryItemRepository = createInventoryItemRepositoryMock();
    eventEmitter = createEventEmitterMock();

    handler = new DeleteSupplierHandler(
      supplierRepository,
      inventoryItemRepository,
      eventEmitter as any,
    );
  });

  it('throws NotFoundException when supplier does not exist', async () => {
    supplierRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new DeleteSupplierCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '550e8400-e29b-41d4-a716-446655440000',
          'actor-1',
          'actor@test.com',
        ),
      ),
    ).rejects.toThrow(NotFoundException);

    expect(supplierRepository.delete).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('throws ConflictException with dependency list when supplier has associated items', async () => {
    supplierRepository.findById.mockResolvedValue(
      makeSupplier({
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      }),
    );
    inventoryItemRepository.findBySupplierId.mockResolvedValue([
      {
        getName: () => 'Soap',
        getSku: () => 'SKU-001',
      } as any,
    ]);

    await expect(
      handler.execute(
        new DeleteSupplierCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '550e8400-e29b-41d4-a716-446655440000',
          'actor-1',
          'actor@test.com',
        ),
      ),
    ).rejects.toThrow(
      'Cannot delete supplier because it is associated with inventory items: Soap (SKU-001)',
    );

    expect(supplierRepository.delete).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('deletes supplier when no associated items and emits audit log diff', async () => {
    supplierRepository.findById.mockResolvedValue(
      makeSupplier({
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      }),
    );
    inventoryItemRepository.findBySupplierId.mockResolvedValue([]);
    supplierRepository.delete.mockResolvedValue(undefined);

    await expect(
      handler.execute(
        new DeleteSupplierCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '550e8400-e29b-41d4-a716-446655440000',
          'actor-1',
          'actor@test.com',
        ),
      ),
    ).resolves.toBeUndefined();

    expect(supplierRepository.delete).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);

    const [eventName, eventPayload] = eventEmitter.emit.mock.calls[0];
    expect(eventName).toBe(AUDIT_LOG_EVENT);
    expect(eventPayload).toBeInstanceOf(AuditLoggedEvent);

    const auditPayload = eventPayload as AuditLoggedEvent;
    expect(auditPayload.action).toBe(AuditAction.SUPPLIER_DELETED);
    expect(auditPayload.entityType).toBe(AuditEntityType.SUPPLIER);
    expect(auditPayload.entityId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(auditPayload.metadata).toEqual({ changedFields: ['deletedAt'] });
    expect(auditPayload.previousValue).toEqual({ deletedAt: null });
    expect(auditPayload.newValue).toEqual(
      expect.objectContaining({ deletedAt: expect.any(String) }),
    );
  });
});
