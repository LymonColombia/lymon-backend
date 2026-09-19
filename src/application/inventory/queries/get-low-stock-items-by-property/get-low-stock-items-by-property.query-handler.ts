import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLowStockItemsByPropertyQuery } from './get-low-stock-items-by-property.query';
import { GetLowStockItemsByPropertyResult } from './get-low-stock-items-by-property.result';
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

@QueryHandler(GetLowStockItemsByPropertyQuery)
export class GetLowStockItemsByPropertyQueryHandler implements IQueryHandler<
  GetLowStockItemsByPropertyQuery,
  GetLowStockItemsByPropertyResult
> {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryItemRepository: InventoryItemRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
  ) {}

  async execute(
    query: GetLowStockItemsByPropertyQuery,
  ): Promise<GetLowStockItemsByPropertyResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const propertyId = PropertyId.create(query.propertyId);

    const property = await this.propertyRepository.findById(propertyId);
    if (
      !property ||
      property?.getTenantId().toString() !== tenantId.toString()
    ) {
      throw new NotFoundException('Property not found');
    }

    const items = await this.inventoryItemRepository.findLowStockByPropertyId(
      tenantId,
      propertyId,
    );

    return new GetLowStockItemsByPropertyResult(items.map(toInventoryItemDto));
  }
}
