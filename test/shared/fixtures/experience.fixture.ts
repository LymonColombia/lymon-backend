import { Experience } from '@/domain/experience/entities/experience.entity';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import {
  ExperienceCategory,
  ExperienceCategoryEnum,
} from '@/domain/experience/value-objects/experience-category.vo';
import {
  ExperienceAvailabilityType,
  ExperienceAvailabilityTypeEnum,
} from '@/domain/experience/value-objects/experience-availability-type.vo';
import {
  ExperienceStatus,
  ExperienceStatusEnum,
} from '@/domain/experience/value-objects/experience-status.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TENANT_FIXTURE_DEFAULTS } from '@test/shared/fixtures/tenant.fixture';
import { PROPERTY_FIXTURE_DEFAULTS } from '@test/shared/fixtures/property.fixture';

export const EXPERIENCE_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-b9e100000000',
  tenantId: TENANT_FIXTURE_DEFAULTS.id,
  propertyId: PROPERTY_FIXTURE_DEFAULTS.id,
  name: 'Airport transfer',
  description: 'Private transfer from the airport to the property',
  city: 'Medellín',
  priceCop: 120000,
  durationHours: 2,
  minimumParticipants: 1,
  capacity: 8,
  location: { label: 'Main lobby', lat: 4.6097, lng: -74.0817 },
};

export function makeExperience(
  overrides?: Partial<typeof EXPERIENCE_FIXTURE_DEFAULTS>,
): Experience {
  const merged = { ...EXPERIENCE_FIXTURE_DEFAULTS, ...overrides };
  return Experience.reconstitute({
    id: ExperienceId.create(merged.id),
    tenantId: TenantId.createFromString(merged.tenantId),
    propertyId: PropertyId.create(merged.propertyId),
    unitIds: [],
    name: merged.name,
    description: merged.description,
    city: merged.city,
    category: ExperienceCategory.create(ExperienceCategoryEnum.TRANSPORTATION),
    priceCop: merged.priceCop,
    durationHours: merged.durationHours,
    minimumParticipants: merged.minimumParticipants,
    capacity: merged.capacity,
    location: merged.location,
    availabilityType: ExperienceAvailabilityType.create(
      ExperienceAvailabilityTypeEnum.DATE_RANGE,
    ),
    startAt: new Date('2099-01-10T10:00:00.000Z'),
    endAt: new Date('2099-01-20T10:00:00.000Z'),
    blackoutRanges: [],
    allowStandalonePurchase: true,
    allowReservationPurchase: true,
    minNoticeHours: 2,
    purchaseCutoffHours: 24,
    status: ExperienceStatus.create(ExperienceStatusEnum.ACTIVE),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });
}
