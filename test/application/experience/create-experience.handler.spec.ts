import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateExperienceHandler } from '@/application/experience/commands/create-experience.handler';
import { CreateExperienceCommand } from '@/application/experience/commands/create-experience.command';
import { CreateExperienceResult } from '@/application/experience/commands/create-experience.result';
import { ExperienceRepository } from '@/domain/experience/repositories/experience.repository';
import { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { ExperienceAvailabilityTypeEnum } from '@/domain/experience/value-objects/experience-availability-type.vo';
import { ExperienceCategoryEnum } from '@/domain/experience/value-objects/experience-category.vo';
import { createExperienceRepositoryMock } from '@test/shared/mocks/repositories/experience-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { makeProperty } from '@test/shared/fixtures/property.fixture';

const EXPERIENCE_ID = 'experience-123';

function makeCommand(
  overrides?: Partial<CreateExperienceCommand>,
): CreateExperienceCommand {
  const hasPropertyIdOverride =
    overrides !== undefined && Object.hasOwn(overrides, 'propertyId');
  const hasDurationHoursOverride =
    overrides !== undefined && Object.hasOwn(overrides, 'durationHours');
  const hasLocationOverride =
    overrides !== undefined && Object.hasOwn(overrides, 'location');

  return new CreateExperienceCommand(
    overrides?.tenantId ?? '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
    hasPropertyIdOverride ? overrides?.propertyId : '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
    overrides?.unitIds,
    overrides?.name ?? 'Airport transfer',
    overrides?.description ?? 'Roundtrip transportation service',
    overrides?.city ?? 'Medellín',
    overrides?.category ?? ExperienceCategoryEnum.TRANSPORTATION,
    overrides?.priceCop ?? 100000,
    hasDurationHoursOverride ? overrides?.durationHours : 2,
    overrides?.minimumParticipants,
    overrides?.capacity ?? 8,
    hasLocationOverride
      ? overrides?.location
      : {
          label: 'Main lobby',
          lat: 4.6097,
          lng: -74.0817,
        },
    overrides?.availabilityType ?? ExperienceAvailabilityTypeEnum.DATE_RANGE,
    overrides?.startAt ?? '2099-01-10T10:00:00.000Z',
    overrides?.endAt ?? '2099-01-20T10:00:00.000Z',
    overrides?.recurrence,
    overrides?.blackoutRanges,
    overrides?.allowStandalonePurchase ?? true,
    overrides?.allowReservationPurchase ?? true,
    overrides?.mediaKeys,
    overrides?.actorId ?? 'user-123',
    overrides?.actorEmail ?? 'host@example.com',
  );
}

describe('CreateExperienceHandler', () => {
  let handler: CreateExperienceHandler;
  let experienceRepository: jest.Mocked<ExperienceRepository>;
  let propertyRepository: jest.Mocked<PropertyRepository>;
  let unitRepository: jest.Mocked<UnitRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    experienceRepository = createExperienceRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();
    unitRepository = createUnitRepositoryMock();
    eventEmitter = createEventEmitterMock();

    handler = new CreateExperienceHandler(
      experienceRepository,
      propertyRepository,
      unitRepository,
      eventEmitter as any,
    );
  });

  it('throws NotFoundException when property does not exist', async () => {
    propertyRepository.findById.mockResolvedValue(null);

    await expect(handler.execute(makeCommand())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException when name is duplicated in same property', async () => {
    propertyRepository.findById.mockResolvedValue(makeProperty());
    experienceRepository.existsByPropertyIdAndName.mockResolvedValue(true);

    await expect(handler.execute(makeCommand())).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws BadRequestException when unitIds are provided without propertyId', async () => {
    const command = makeCommand({
      propertyId: undefined,
      unitIds: ['65f1a1a2-b3c4-d5e6-f7a8-b9c800000000'],
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when startAt is invalid', async () => {
    const command = makeCommand({
      startAt: 'not-a-date',
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('creates experience and returns id', async () => {
    propertyRepository.findById.mockResolvedValue(makeProperty());
    experienceRepository.existsByPropertyIdAndName.mockResolvedValue(false);
    experienceRepository.save.mockResolvedValue(EXPERIENCE_ID);

    const result = await handler.execute(makeCommand());

    expect(result).toBeInstanceOf(CreateExperienceResult);
    expect(result.experienceId).toBe(EXPERIENCE_ID);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
  });

  it('creates experience without durationHours or location', async () => {
    propertyRepository.findById.mockResolvedValue(makeProperty());
    experienceRepository.existsByPropertyIdAndName.mockResolvedValue(false);
    experienceRepository.save.mockResolvedValue(EXPERIENCE_ID);

    await expect(
      handler.execute(
        makeCommand({ durationHours: undefined, location: undefined }),
      ),
    ).resolves.toBeInstanceOf(CreateExperienceResult);
  });
});
