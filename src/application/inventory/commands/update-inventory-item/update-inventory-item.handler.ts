import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateInventoryItemCommand } from './update-inventory-item.command';
import { UpdateInventoryItemResult } from './update-inventory-item.result';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';
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

@CommandHandler(UpdateInventoryItemCommand)
export class UpdateInventoryItemHandler implements ICommandHandler<
  UpdateInventoryItemCommand,
  UpdateInventoryItemResult
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
    command: UpdateInventoryItemCommand,
  ): Promise<UpdateInventoryItemResult> {
    if (
      command.name === undefined &&
      command.categoryId === undefined &&
      command.unit === undefined &&
      command.minStock === undefined &&
      command.currentStock === undefined
    ) {
      throw new BadRequestException(
        'At least one field is required: name, categoryId, unit or minStock',
      );
    }

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

    let categoryId: InventoryItemCategoryId | undefined;
    if (command.categoryId !== undefined) {
      const rawId = InventoryItemCategoryId.create(command.categoryId);
      const category = await this.categoryRepository.findById(rawId);
      if (category?.getTenantId().toString() !== tenantId.toString()) {
        throw new NotFoundException('Inventory item category not found');
      }
      categoryId = rawId;
    }

    item.update({
      name: command.name,
      categoryId,
      unit: command.unit,
      minStock: command.minStock,
      currentStock: command.currentStock,
    });

    const savedItemId = await this.inventoryItemRepository.save(item);
    return new UpdateInventoryItemResult(savedItemId);
  }
}
