import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RemoveSupplierFromItemCommand } from './remove-supplier-from-item.command';
import { RemoveSupplierFromItemResult } from './remove-supplier-from-item.result';
import {
  INVENTORY_ITEM_REPOSITORY,
  type InventoryItemRepository,
} from '@/domain/inventory/repositories/inventory-item.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  SUPPLIER_REPOSITORY,
  type SupplierRepository,
} from '@/domain/inventory/repositories/supplier.repository';
import { Supplier } from '@/domain/inventory/entities/supplier.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import { buildAuditDiff } from '@/domain/shared/utils/audit-diff.util';

type InventoryItemWithSupplierAssociation = {
  getSupplierId(): SupplierId | null;
  removeSupplier(): void;
};

@CommandHandler(RemoveSupplierFromItemCommand)
export class RemoveSupplierFromItemHandler implements ICommandHandler<
  RemoveSupplierFromItemCommand,
  RemoveSupplierFromItemResult
> {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryItemRepository: InventoryItemRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: RemoveSupplierFromItemCommand,
  ): Promise<RemoveSupplierFromItemResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const propertyId = PropertyId.create(command.propertyId);
    const itemId = InventoryItemId.create(command.itemId);

    const property = await this.propertyRepository.findById(propertyId);
    const propertyTenantId = property?.getTenantId?.()?.toString?.();
    if (
      !property ||
      !propertyTenantId ||
      propertyTenantId !== tenantId.toString()
    ) {
      throw new NotFoundException('Property not found');
    }

    const item = await this.inventoryItemRepository.findById(itemId);
    const itemTenantId = item?.getTenantId?.()?.toString?.();
    const itemPropId = item?.getPropertyId?.()?.toString?.();
    if (
      !item ||
      !itemTenantId ||
      itemTenantId !== tenantId.toString() ||
      !itemPropId ||
      itemPropId !== propertyId.toString()
    ) {
      throw new NotFoundException('Inventory item not found');
    }

    const inventoryItem = item as InventoryItemWithSupplierAssociation;

    const supplierId: SupplierId | null = inventoryItem.getSupplierId();
    const previousSnapshot = this.getItemSupplierSnapshot(inventoryItem);
    inventoryItem.removeSupplier();
    const nextSnapshot = this.getItemSupplierSnapshot(inventoryItem);
    const auditDiff = buildAuditDiff(previousSnapshot, nextSnapshot);

    await this.inventoryItemRepository.save(item);

    if (supplierId) {
      const supplier = await this.supplierRepository.findById(supplierId);
      if (supplier?.getTenantId().toString() === tenantId.toString()) {
        await this.supplierRepository.save(
          Supplier.reconstitute({
            id: supplier.getId()!,
            tenantId: supplier.getTenantId(),
            name: supplier.getName(),
            contactEmail: supplier.getContactEmail(),
            contactPhone: supplier.getContactPhone(),
            country: supplier.getCountry(),
            city: supplier.getCity(),
            nit: supplier.getNit(),
            createdAt: supplier.getCreatedAt(),
            updatedAt: new Date(),
            deletedAt: supplier.getDeletedAt(),
          }),
        );

        this.eventEmitter.emit(
          AUDIT_LOG_EVENT,
          new AuditLoggedEvent(
            command.tenantId,
            command.actorId ?? '',
            command.actorEmail ?? '',
            AuditAction.SUPPLIER_UPDATED,
            AuditEntityType.SUPPLIER,
            supplierId.toString(),
            auditDiff.changedFields.length > 0
              ? { changedFields: auditDiff.changedFields }
              : undefined,
            auditDiff.previousValue,
            auditDiff.newValue,
          ),
        );
      }
    }

    return new RemoveSupplierFromItemResult(itemId.toString());
  }

  private getItemSupplierSnapshot(item: {
    getSupplierId(): { toString(): string } | null;
  }): Record<string, unknown> {
    return {
      supplierId: item.getSupplierId()?.toString() ?? null,
    };
  }
}
