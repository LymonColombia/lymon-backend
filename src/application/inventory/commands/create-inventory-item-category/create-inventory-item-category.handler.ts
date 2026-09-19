import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateInventoryItemCategoryCommand } from './create-inventory-item-category.command';
import { CreateInventoryItemCategoryResult } from './create-inventory-item-category.result';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  INVENTORY_ITEM_CATEGORY_REPOSITORY,
  type InventoryItemCategoryRepository,
} from '@/domain/inventory/repositories/inventory-item-category.repository';
import { InventoryItemCategory } from '@/domain/inventory/entities/inventory-item-category.entity';

@CommandHandler(CreateInventoryItemCategoryCommand)
export class CreateInventoryItemCategoryHandler implements ICommandHandler<
  CreateInventoryItemCategoryCommand,
  CreateInventoryItemCategoryResult
> {
  constructor(
    @Inject(INVENTORY_ITEM_CATEGORY_REPOSITORY)
    private readonly categoryRepository: InventoryItemCategoryRepository,
  ) {}

  async execute(
    command: CreateInventoryItemCategoryCommand,
  ): Promise<CreateInventoryItemCategoryResult> {
    const tenantId = TenantId.createFromString(command.tenantId);

    const existing = await this.categoryRepository.findByName(
      tenantId,
      command.name,
    );
    if (existing) {
      throw new ConflictException(
        'An inventory item category with this name already exists',
      );
    }

    const category = InventoryItemCategory.create({
      tenantId,
      name: command.name,
      description: command.description,
    });

    const id = await this.categoryRepository.save(category);

    return new CreateInventoryItemCategoryResult(
      id,
      category.getName(),
      category.getDescription(),
    );
  }
}
