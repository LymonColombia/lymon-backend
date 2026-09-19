import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetPropertiesByTenantQuery } from './get-properties-by-tenant.query';
import {
  PropertyDto,
  GetPropertiesByTenantResult,
} from './get-properties-by-tenant.result';
import { PROPERTY_REPOSITORY } from '@/domain/property/repositories/property.repository';
import type { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@QueryHandler(GetPropertiesByTenantQuery)
export class GetPropertiesByTenantQueryHandler implements IQueryHandler<
  GetPropertiesByTenantQuery,
  GetPropertiesByTenantResult
> {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storage: R2StorageService,
  ) {}

  async execute(
    query: GetPropertiesByTenantQuery,
  ): Promise<GetPropertiesByTenantResult> {
    const tenantId = TenantId.createFromString(query.tenantId);

    const properties = await this.propertyRepository.findByTenantId(tenantId);

    const total = properties.length;
    const start = (query.page - 1) * query.limit;
    const paginatedProperties = properties.slice(start, start + query.limit);

    const dtos = paginatedProperties.map(
      (property) =>
        new PropertyDto(
          property.getId()?.toString() ?? '',
          property.getSlug(),
          property.getName(),
          property.getDescription(),
          property.getPropertyType().toString(),
          property.getAddress(),
          property.getCity(),
          property.getCreatedAt(),
          property.getImageKey()
            ? this.storage.getPublicUrl(property.getImageKey()!)
            : null,
        ),
    );

    return new GetPropertiesByTenantResult(
      dtos,
      total,
      query.page,
      query.limit,
    );
  }
}
