import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInventoryItemCategoriesQuery } from './get-inventory-item-categories.query';
import {
  GetInventoryItemCategoriesResult,
  type InventoryItemCategoryListItemDto,
} from './get-inventory-item-categories.result';
import {
  INVENTORY_ITEM_CATEGORY_REPOSITORY,
  type InventoryItemCategoryRepository,
} from '@/domain/inventory/repositories/inventory-item-category.repository';
import { type InventoryItemCategory } from '@/domain/inventory/entities/inventory-item-category.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@QueryHandler(GetInventoryItemCategoriesQuery)
export class GetInventoryItemCategoriesQueryHandler implements IQueryHandler<
  GetInventoryItemCategoriesQuery,
  GetInventoryItemCategoriesResult
> {
  constructor(
    @Inject(INVENTORY_ITEM_CATEGORY_REPOSITORY)
    private readonly categoryRepository: InventoryItemCategoryRepository,
  ) {}

  async execute(
    query: GetInventoryItemCategoriesQuery,
  ): Promise<GetInventoryItemCategoriesResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 ? query.limit : 10;
    const normalizedSearch = query.search?.trim().toLowerCase() ?? '';

    const categories = await this.categoryRepository.findByTenantId(tenantId);

    const filtered = normalizedSearch
      ? categories.filter((c) =>
          c.getName().toLowerCase().includes(normalizedSearch),
        )
      : categories;

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return new GetInventoryItemCategoriesResult(
      paginated.map((c) => this.toDto(c)),
      total,
      page,
      limit,
    );
  }

  private toDto(
    category: InventoryItemCategory,
  ): InventoryItemCategoryListItemDto {
    return {
      id: category.getId()?.toString() ?? '',
      name: category.getName(),
      description: category.getDescription(),
      createdAt: category.getCreatedAt().toISOString(),
      updatedAt: category.getUpdatedAt().toISOString(),
    };
  }
}
