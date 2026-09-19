import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetUnitsByPropertyQuery } from './get-units-by-property.query';
import {
  UnitDto,
  GetUnitsByPropertyResult,
} from './get-units-by-property.result';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PROPERTY_REPOSITORY } from '@/domain/property/repositories/property.repository';
import { UNIT_REPOSITORY } from '@/domain/unit/repositories/unit.repository';
import type { PropertyRepository } from '@/domain/property/repositories/property.repository';
import type { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@QueryHandler(GetUnitsByPropertyQuery)
export class GetUnitsByPropertyQueryHandler implements IQueryHandler<
  GetUnitsByPropertyQuery,
  GetUnitsByPropertyResult
> {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storage: R2StorageService,
  ) {}

  async execute(
    query: GetUnitsByPropertyQuery,
  ): Promise<GetUnitsByPropertyResult> {
    // Verify the property belongs to the tenant
    const tenantId = TenantId.createFromString(query.tenantId);
    const propertyId = PropertyId.create(query.propertyId);

    const property = await this.propertyRepository.findById(propertyId);

    if (!property) {
      throw new Error('Property not found');
    }

    if (!property.getTenantId().equals(tenantId)) {
      throw new Error('Property does not belong to the tenant');
    }

    // Get all units for this property
    const units = await this.unitRepository.findByPropertyId(propertyId);

    // Apply pagination
    const total = units.length;
    const start = (query.page - 1) * query.limit;
    const paginatedUnits = units.slice(start, start + query.limit);

    // Map to DTOs
    const dtos = paginatedUnits.map((unit) => {
      const unitId = unit.getId();
      return new UnitDto(
        unitId ? unitId.toString() : '',
        unit.getName(),
        unit.getDescription(),
        unit.getInventoryCount(),
        unit.getMaxGuests(),
        unit.getStandardGuests(),
        unit.getBathroomsCount(),
        unit.getIsShared(),
        unit.getAmenities(),
        unit.getPricePerNight(),
        unit.getCreatedAt(),
        unit.getRating(),
        unit.getMediaKeys().map((k) => this.storage.getPublicUrl(k)),
      );
    });

    return new GetUnitsByPropertyResult(dtos, total, query.page, query.limit);
  }
}
