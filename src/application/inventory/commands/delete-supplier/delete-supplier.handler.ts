import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteSupplierCommand } from './delete-supplier.command';
import {
  SUPPLIER_REPOSITORY,
  type SupplierRepository,
} from '@/domain/inventory/repositories/supplier.repository';
import {
  INVENTORY_ITEM_REPOSITORY,
  type InventoryItemRepository,
} from '@/domain/inventory/repositories/inventory-item.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { Supplier } from '@/domain/inventory/entities/supplier.entity';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { buildAuditDiff } from '@/domain/shared/utils/audit-diff.util';

@CommandHandler(DeleteSupplierCommand)
export class DeleteSupplierHandler implements ICommandHandler<
  DeleteSupplierCommand,
  void
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeleteSupplierCommand): Promise<void> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const supplierId = SupplierId.create(command.supplierId);

    const supplier = await this.supplierRepository.findById(supplierId);
    const supplierTenantId = supplier?.getTenantId?.()?.toString?.();
    if (
      !supplier ||
      !supplierTenantId ||
      supplierTenantId !== tenantId.toString()
    ) {
      throw new NotFoundException('Supplier not found');
    }

    const items = await this.inventoryItemRepository.findBySupplierId(
      tenantId,
      supplierId,
    );

    try {
      supplier.assertCanBeDeleted(
        items.map((item) => ({
          name: item.getName(),
          sku: item.getSku(),
        })),
      );
    } catch (error) {
      if (error instanceof DomainException) {
        throw new ConflictException(error.message);
      }
      throw error;
    }

    const previousSnapshot = this.getSupplierSnapshot(supplier);
    const deletedAt = new Date().toISOString();
    const nextSnapshot: Record<string, unknown> = {
      ...previousSnapshot,
      deletedAt,
    };
    const auditDiff = buildAuditDiff(previousSnapshot, nextSnapshot);

    await this.supplierRepository.delete(supplierId);

    if (command.actorId && command.actorEmail) {
      this.eventEmitter.emit(
        AUDIT_LOG_EVENT,
        new AuditLoggedEvent(
          command.tenantId,
          command.actorId,
          command.actorEmail,
          AuditAction.SUPPLIER_DELETED,
          AuditEntityType.SUPPLIER,
          command.supplierId,
          auditDiff.changedFields.length > 0
            ? { changedFields: auditDiff.changedFields }
            : undefined,
          auditDiff.previousValue,
          auditDiff.newValue,
        ),
      );
    }
  }

  private getSupplierSnapshot(supplier: Supplier): Record<string, unknown> {
    return {
      name: supplier.getName(),
      contactEmail: supplier.getContactEmail(),
      contactPhone: supplier.getContactPhone(),
      country: supplier.getCountry(),
      city: supplier.getCity(),
      nit: supplier.getNit(),
      deletedAt: supplier.getDeletedAt(),
    };
  }
}
