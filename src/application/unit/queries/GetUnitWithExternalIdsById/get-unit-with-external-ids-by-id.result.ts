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

export class UnitWithExternalIdsDto extends PublicUnitDto {
  constructor(
    id: string,
    name: string,
    description: string,
    maxGuests: number,
    standardGuests: number,
    bedrooms: PublicBedroomDto[],
    bathroomsCount: number,
    isShared: boolean,
    amenities: string[],
    pricePerNight: number,
    tenantId: string,
    propertyId: string,
    rating: number | null,
    mediaUrls: string[],
    public readonly externalIds: ExternalIdsDto,
  ) {
    super(
      id,
      name,
      description,
      maxGuests,
      standardGuests,
      bedrooms,
      bathroomsCount,
      isShared,
      amenities,
      pricePerNight,
      tenantId,
      propertyId,
      rating,
      mediaUrls,
    );
  }
}

export class GetUnitWithExternalIdsByIdResult {
  constructor(public readonly unit: UnitWithExternalIdsDto) {}
}
