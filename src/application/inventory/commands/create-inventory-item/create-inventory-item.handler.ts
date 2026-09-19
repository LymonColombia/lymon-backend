import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateInventoryItemCommand } from './create-inventory-item.command';
import { CreateInventoryItemResult } from './create-inventory-item.result';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import {
  INVENTORY_ITEM_REPOSITORY,
  type InventoryItemRepository,
} from '@/domain/inventory/repositories/inventory-item.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  INVENTORY_ITEM_CATEGORY_REPOSITORY,
  type InventoryItemCategoryRepository,
} from '@/domain/inventory/repositories/inventory-item-category.repository';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';
import { InventoryItem } from '@/domain/inventory/entities/inventory-item.entity';

@CommandHandler(CreateInventoryItemCommand)
export class CreateInventoryItemHandler implements ICommandHandler<
  CreateInventoryItemCommand,
  CreateInventoryItemResult
> {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryItemRepository: InventoryItemRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(INVENTORY_ITEM_CATEGORY_REPOSITORY)
    private readonly categoryRepository: InventoryItemCategoryRepository,
  ) {}

  async execute(
    command: CreateInventoryItemCommand,
  ): Promise<CreateInventoryItemResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const propertyId = PropertyId.create(command.propertyId);

    const property = await this.propertyRepository.findById(propertyId);
    const propertyTenantId = property?.getTenantId?.()?.toString?.();
    if (
      !property ||
      !propertyTenantId ||
      propertyTenantId !== tenantId.toString()
    ) {
      throw new NotFoundException('Property not found');
    }

    const categoryId = InventoryItemCategoryId.create(command.categoryId);
    const category = await this.categoryRepository.findById(categoryId);
    if (category?.getTenantId().toString() !== tenantId.toString()) {
      throw new NotFoundException('Inventory item category not found');
    }

    const existingItem =
      await this.inventoryItemRepository.findByPropertyIdAndSku(
        tenantId,
        propertyId,
        command.sku,
      );
    if (existingItem) {
      throw new ConflictException(
        'An inventory item with this SKU already exists in this property',
      );
    }

    const item = InventoryItem.create({
      tenantId,
      propertyId,
      sku: command.sku,
      name: command.name,
      categoryId,
      unit: command.unit,
      minStock: command.minStock,
      initialStock: command.initialStock,
    });

    const itemId = await this.inventoryItemRepository.save(item);
    return new CreateInventoryItemResult(itemId, item.getCurrentStock());
  }
}
