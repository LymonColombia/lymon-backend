import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSuppliersQuery } from './get-suppliers.query';
import {
  GetSuppliersResult,
  type SupplierListItemDto,
} from './get-suppliers.result';
import {
  type SupplierSortBy,
  type SupplierSortOrder,
} from './get-suppliers.query';
import {
  SUPPLIER_REPOSITORY,
  type SupplierRepository,
} from '@/domain/inventory/repositories/supplier.repository';
import { type Supplier } from '@/domain/inventory/entities/supplier.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@QueryHandler(GetSuppliersQuery)
export class GetSuppliersQueryHandler implements IQueryHandler<
  GetSuppliersQuery,
  GetSuppliersResult
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
  ) {}

  async execute(query: GetSuppliersQuery): Promise<GetSuppliersResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 ? query.limit : 10;
    const normalizedSearch = query.search?.trim().toLowerCase() ?? '';

    const suppliers: Supplier[] = await this.supplierRepository.findByTenantId(
      tenantId,
      {
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    );

    const filtered: Supplier[] = normalizedSearch
      ? suppliers.filter((supplier) =>
          supplier.getName().toLowerCase().includes(normalizedSearch),
        )
      : suppliers;
    const sorted = this.sortSuppliers(filtered, query.sortBy, query.sortOrder);

    const total = sorted.length;
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit);

    return new GetSuppliersResult(
      paginated.map((supplier) => this.toSupplierListItemDto(supplier)),
      total,
      page,
      limit,
    );
  }

  private sortSuppliers(
    suppliers: Supplier[],
    sortBy: SupplierSortBy,
    sortOrder: SupplierSortOrder,
  ): Supplier[] {
    const sorted = [...suppliers].sort((a, b) => {
      if (sortBy === 'name') {
        return a.getName().localeCompare(b.getName());
      }

      return a.getCreatedAt().getTime() - b.getCreatedAt().getTime();
    });

    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }

  private toSupplierListItemDto(supplier: Supplier): SupplierListItemDto {
    return {
      supplierId: supplier.getId()?.toString() ?? '',
      name: supplier.getName(),
      contactEmail: supplier.getContactEmail(),
      contactPhone: supplier.getContactPhone(),
      country: supplier.getCountry(),
      city: supplier.getCity(),
      nit: supplier.getNit(),
      status: supplier.getDeletedAt() ? 'INACTIVE' : 'ACTIVE',
      createdAt: supplier.getCreatedAt().toISOString(),
    };
  }
}
