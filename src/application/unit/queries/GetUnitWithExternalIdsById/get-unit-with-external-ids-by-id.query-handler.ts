import { Inject, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetUnitWithExternalIdsByIdQuery } from './get-unit-with-external-ids-by-id.query';
import {
  ExternalIdsDto,
  GetUnitWithExternalIdsByIdResult,
  UnitWithExternalIdsDto,
} from './get-unit-with-external-ids-by-id.result';
import { UNIT_REPOSITORY } from '@/domain/unit/repositories/unit.repository';
import type { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import {
  PublicBedDto,
  PublicBedroomDto,
} from '@/application/unit/queries/GetPublicUnitsByTenant/get-public-units-by-tenant.result';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@QueryHandler(GetUnitWithExternalIdsByIdQuery)
export class GetUnitWithExternalIdsByIdQueryHandler implements IQueryHandler<
  GetUnitWithExternalIdsByIdQuery,
  GetUnitWithExternalIdsByIdResult
> {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storage: R2StorageService,
  ) {}

  async execute(
    query: GetUnitWithExternalIdsByIdQuery,
  ): Promise<GetUnitWithExternalIdsByIdResult> {
    const unitId = UnitId.create(query.unitId);
    const unit = await this.unitRepository.findById(unitId);

    if (!unit || unit.getTenantId().toString() !== query.tenantId) {
      throw new NotFoundException('Unit not found');
    }

    const bedrooms = unit.getBedrooms().map(
      (bedroom) =>
        new PublicBedroomDto(
          bedroom.roomName,
          bedroom.beds.map((bed) => new PublicBedDto(bed.type, bed.count)),
        ),
    );

    const externalIds = unit.getExternalIds();
    const externalIdsDto = new ExternalIdsDto(
      externalIds?.getAirbnbId(),
      externalIds?.getBookingId(),
      externalIds?.getVrboId(),
    );

    const dto = new UnitWithExternalIdsDto(
      unit.getId()?.toString() ?? '',
      unit.getName(),
      unit.getDescription(),
      unit.getMaxGuests(),
      unit.getStandardGuests(),
      bedrooms,
      unit.getBathroomsCount(),
      unit.getIsShared(),
      unit.getAmenities(),
      unit.getPricePerNight(),
      unit.getTenantId().toString(),
      unit.getPropertyId().toString(),
      unit.getRating(),
      unit.getMediaKeys().map((k) => this.storage.getPublicUrl(k)),
      externalIdsDto,
    );

    return new GetUnitWithExternalIdsByIdResult(dto);
  }
}
