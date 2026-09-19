import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListCatalogItemsByTenantQuery } from './list-catalog-items-by-tenant.query';
import {
  CatalogItemDto,
  ListCatalogItemsByTenantResult,
} from './list-catalog-items-by-tenant.result';
import {
  GUEST_PREFERENCE_CATALOG_REPOSITORY,
  type GuestPreferenceCatalogRepository,
} from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestPreferenceCatalogItem } from '@/domain/guest-preference/entities/guest-preference-catalog-item.entity';

@QueryHandler(ListCatalogItemsByTenantQuery)
export class ListCatalogItemsByTenantQueryHandler implements IQueryHandler<
  ListCatalogItemsByTenantQuery,
  ListCatalogItemsByTenantResult
> {
  constructor(
    @Inject(GUEST_PREFERENCE_CATALOG_REPOSITORY)
    private readonly repository: GuestPreferenceCatalogRepository,
  ) {}

  async execute(
    query: ListCatalogItemsByTenantQuery,
  ): Promise<ListCatalogItemsByTenantResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const items = await this.repository.findByTenant(tenantId);
    const filtered = query.includeInactive
      ? items
      : items.filter((item) => item.getIsActive());

    return new ListCatalogItemsByTenantResult(
      filtered.map((item) => this.toDto(item)),
    );
  }

  private toDto(item: GuestPreferenceCatalogItem): CatalogItemDto {
    return new CatalogItemDto(
      item.getId()!,
      item.getTenantId().toString(),
      item.getCategory(),
      item.getSource(),
      item.getKey(),
      item.getLabel(),
      item.getIsActive(),
      item.getCreatedAt(),
      item.getUpdatedAt(),
    );
  }
}
