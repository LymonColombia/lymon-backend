import { NotFoundException } from '@nestjs/common';
import { GetAvailableExperienceByIdQuery } from '@/application/experience/queries/GetAvailableExperienceById/get-available-experience-by-id.query';
import { GetAvailableExperienceByIdQueryHandler } from '@/application/experience/queries/GetAvailableExperienceById/get-available-experience-by-id.query-handler';
import { GetAvailableExperienceByIdResult } from '@/application/experience/queries/GetAvailableExperienceById/get-available-experience-by-id.result';
import { Experience } from '@/domain/experience/entities/experience.entity';
import type { ExperienceRepository } from '@/domain/experience/repositories/experience.repository';
import type { PropertyRepository } from '@/domain/property/repositories/property.repository';
import type { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { ExperienceAvailabilityType } from '@/domain/experience/value-objects/experience-availability-type.vo';
import { ExperienceCategory } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperienceStatus } from '@/domain/experience/value-objects/experience-status.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { createExperienceRepositoryMock } from '@test/shared/mocks/repositories/experience-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';

const EXPERIENCE_ID = 'experience-123';

function makeExperience(status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
  return Experience.reconstitute({
    id: ExperienceId.create(EXPERIENCE_ID),
    tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
    propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'),
    unitIds: [UnitId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c800000000')],
    name: 'Airport transfer',
    description: 'Private transfer service',
    city: 'Medellín',
    category: ExperienceCategory.create('TRANSPORTATION'),
    priceCop: 120000,
    durationHours: 2,
    capacity: 8,
    location: {
      label: 'Main lobby',
      address: 'Cra 10 #20-30, Bogota',
      lat: 4.6097,
      lng: -74.0817,
    },
    availabilityType: ExperienceAvailabilityType.create('DATE_RANGE'),
    startAt: new Date('2099-01-10T10:00:00.000Z'),
    endAt: new Date('2099-01-20T10:00:00.000Z'),
    recurrence: undefined,
    blackoutRanges: [],
    allowStandalonePurchase: true,
    allowReservationPurchase: true,
    minNoticeHours: 2,
    purchaseCutoffHours: 24,
    status: ExperienceStatus.create(status),
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
    deletedAt: null,
  });
}

describe('GetAvailableExperienceByIdQueryHandler', () => {
  let handler: GetAvailableExperienceByIdQueryHandler;
  let experienceRepository: jest.Mocked<ExperienceRepository>;
  let propertyRepository: jest.Mocked<PropertyRepository>;
  let unitRepository: jest.Mocked<UnitRepository>;

  beforeEach(() => {
    experienceRepository = createExperienceRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();
    unitRepository = createUnitRepositoryMock();
    handler = new GetAvailableExperienceByIdQueryHandler(
      experienceRepository,
      propertyRepository,
      unitRepository,
      { getPublicUrl: (k: string) => k } as any,
    );
    propertyRepository.findById.mockResolvedValue(null);
    unitRepository.findByIds.mockResolvedValue([]);
  });

  it('returns active experience by id', async () => {
    experienceRepository.findById.mockResolvedValue(makeExperience('ACTIVE'));

    const result = await handler.execute(
      new GetAvailableExperienceByIdQuery(EXPERIENCE_ID),
    );

    expect(result).toBeInstanceOf(GetAvailableExperienceByIdResult);
    expect(result.experience.id).toBe(EXPERIENCE_ID);
  });

  it('throws not found when experience does not exist', async () => {
    experienceRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new GetAvailableExperienceByIdQuery(EXPERIENCE_ID)),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws not found when experience is not active', async () => {
    experienceRepository.findById.mockResolvedValue(makeExperience('ARCHIVED'));

    await expect(
      handler.execute(new GetAvailableExperienceByIdQuery(EXPERIENCE_ID)),
    ).rejects.toThrow(NotFoundException);
  });
});
