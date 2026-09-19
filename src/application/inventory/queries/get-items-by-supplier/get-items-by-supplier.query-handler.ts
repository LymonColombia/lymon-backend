import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetItemsBySupplierQuery } from './get-items-by-supplier.query';
import { GetItemsBySupplierResult } from './get-items-by-supplier.result';
import {
  INVENTORY_ITEM_REPOSITORY,
  type InventoryItemRepository,
} from '@/domain/inventory/repositories/inventory-item.repository';
import {
  SUPPLIER_REPOSITORY,
  type SupplierRepository,
} from '@/domain/inventory/repositories/supplier.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { toInventoryItemDto } from '@/application/inventory/queries/shared/inventory-item.dto';

@QueryHandler(GetItemsBySupplierQuery)
export class GetItemsBySupplierQueryHandler implements IQueryHandler<
  GetItemsBySupplierQuery,
  GetItemsBySupplierResult
> {
  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY)
    private readonly inventoryItemRepository: InventoryItemRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
  ) {}

  async execute(
    query: GetItemsBySupplierQuery,
  ): Promise<GetItemsBySupplierResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const supplierId = SupplierId.create(query.supplierId);

    const supplier = await this.supplierRepository.findById(supplierId);
    if (supplier?.getTenantId().toString() !== tenantId.toString()) {
      throw new NotFoundException('Supplier not found');
    }

    const items = await this.inventoryItemRepository.findBySupplierId(
      tenantId,
      supplierId,
    );

    const total = items.length;
    const start = (query.page - 1) * query.limit;
    const paginatedItems = items.slice(start, start + query.limit);

    return new GetItemsBySupplierResult(
      paginatedItems.map(toInventoryItemDto),
      total,
      query.page,
      query.limit,
    );
  }
}
