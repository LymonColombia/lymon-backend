import {
  PublicBedroomDto,
  PublicUnitDto,
} from '@/application/unit/queries/GetPublicUnitsByTenant/get-public-units-by-tenant.result';

export class ExternalIdsDto {
  constructor(
    public readonly airbnbId?: string,
    public readonly bookingId?: string,
    public readonly vrboId?: string,
  ) {}
}

export interface UnitWithExternalIdsDtoProps {
  unit: PublicUnitDto;
  externalIds: ExternalIdsDto;
}

export class UnitWithExternalIdsDto extends PublicUnitDto {
  public readonly externalIds: ExternalIdsDto;

  constructor({ unit, externalIds }: UnitWithExternalIdsDtoProps) {
    super(
      unit.id,
      unit.name,
      unit.description,
      unit.maxGuests,
      unit.standardGuests,
      unit.bedrooms,
      unit.bathroomsCount,
      unit.amenities,
      unit.pricePerNight,
      unit.tenantId,
      unit.propertyId,
      unit.rating,
      unit.mediaUrls,
    );
    this.externalIds = externalIds;
  }
}

export class GetUnitWithExternalIdsByIdResult {
  constructor(public readonly unit: UnitWithExternalIdsDto) {}
}
