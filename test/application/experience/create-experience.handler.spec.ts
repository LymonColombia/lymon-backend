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
import { ExperienceAvailabilityTypeEnum } from '@/domain/experience/value-objects/experience-availability-type.vo';
import { ExperienceCategoryEnum } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceScopeEnum } from '@/domain/experience/value-objects/experience-scope.vo';
import { createExperienceRepositoryMock } from '@test/shared/mocks/repositories/experience-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { makeProperty } from '@test/shared/fixtures/property.fixture';

const EXPERIENCE_ID = 'experience-123';

function makeCommand(
  overrides?: Partial<CreateExperienceCommand>,
): CreateExperienceCommand {
  const hasPropertyIdOverride =
    overrides !== undefined && Object.hasOwn(overrides, 'propertyId');
  const hasRecurrenceOverride =
    overrides !== undefined && Object.hasOwn(overrides, 'recurrence');

  return new CreateExperienceCommand(
    overrides?.tenantId ?? '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
    overrides?.scope ?? ExperienceScopeEnum.PROPERTY,
    hasPropertyIdOverride
      ? overrides?.propertyId
      : '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
    overrides?.name ?? 'Airport transfer',
    overrides?.description ?? 'Roundtrip transportation service',
    overrides?.city ?? 'Medellín',
    overrides?.category ?? ExperienceCategoryEnum.TRANSPORTATION,
    overrides?.priceCop ?? 100000,
    overrides?.minimumParticipants,
    overrides?.capacity ?? 8,
    overrides?.availabilityType ?? ExperienceAvailabilityTypeEnum.RECURRING,
    hasRecurrenceOverride
      ? overrides?.recurrence
      : { daysOfWeek: [1, 3, 5], startTime: '09:00', endTime: '17:00' },
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
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    experienceRepository = createExperienceRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();
    eventEmitter = createEventEmitterMock();

    handler = new CreateExperienceHandler(
      experienceRepository,
      propertyRepository,
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

  it('throws BadRequestException when PROPERTY scope has no propertyId', async () => {
    const command = makeCommand({ propertyId: undefined });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when recurrence is missing', async () => {
    const command = makeCommand({ recurrence: undefined });

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

  it('creates GLOBAL experience without property lookup', async () => {
    experienceRepository.save.mockResolvedValue(EXPERIENCE_ID);

    await expect(
      handler.execute(
        makeCommand({
          scope: ExperienceScopeEnum.GLOBAL,
          propertyId: undefined,
        }),
      ),
    ).resolves.toBeInstanceOf(CreateExperienceResult);
    expect(propertyRepository.findById).not.toHaveBeenCalled();
  });
});
