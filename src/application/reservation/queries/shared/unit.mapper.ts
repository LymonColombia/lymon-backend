import {
  PublicBedDto,
  PublicBedroomDto,
  PublicUnitDto,
} from '@/application/unit/queries/GetPublicUnitsByTenant/get-public-units-by-tenant.result';
import { Unit } from '@/domain/unit/entities/unit.entity';

export function mapUnitToPublicDto(
  unit: Unit,
  getPublicUrl: (key: string) => string,
): PublicUnitDto {
  const unitId = unit.getId();
  const bedrooms = unit.getBedrooms().map(
    (bedroom) =>
      new PublicBedroomDto(
        bedroom.roomName,
        bedroom.beds.map((bed) => new PublicBedDto(bed.type, bed.count)),
      ),
  );
  return new PublicUnitDto(
    unitId ? unitId.toString() : '',
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
    unit.getMediaKeys().map(getPublicUrl),
  );
}
