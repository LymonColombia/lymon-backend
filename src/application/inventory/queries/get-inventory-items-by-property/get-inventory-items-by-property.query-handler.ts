import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInventoryItemsByPropertyQuery } from './get-inventory-items-by-property.query';
import { GetInventoryItemsByPropertyResult } from './get-inventory-items-by-property.result';
import {
  INVENTORY_ITEM_REPOSITORY,
  type InventoryItemRepository,
} from '@/domain/inventory/repositories/inventory-item.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { toInventoryItemDto } from '@/application/inventory/queries/shared/inventory-item.dto';

@QueryHandler(GetInventoryItemsByPropertyQuery)
export class GetInventoryItemsByPropertyQueryHandler implements IQueryHandler<
  GetInventoryItemsByPropertyQuery,
  GetInventoryItemsByPropertyResult
> {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryItemRepository: InventoryItemRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
  ) {}

  async execute(
    query: GetInventoryItemsByPropertyQuery,
  ): Promise<GetInventoryItemsByPropertyResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const propertyId = PropertyId.create(query.propertyId);

    const property = await this.propertyRepository.findById(propertyId);
    if (
      !property ||
      property?.getTenantId().toString() !== tenantId.toString()
    ) {
      throw new NotFoundException('Property not found');
    }

    const items = await this.inventoryItemRepository.findByPropertyId(
      tenantId,
      propertyId,
    );

    const filtered = query.supplierId
      ? items.filter(
          (item) => item.getSupplierId()?.toString() === query.supplierId,
        )
      : items;

    const total = filtered.length;
    const start = (query.page - 1) * query.limit;
    const paginatedItems = filtered.slice(start, start + query.limit);

    return new GetInventoryItemsByPropertyResult(
      paginatedItems.map(toInventoryItemDto),
      total,
      query.page,
      query.limit,
    );
  }
}
