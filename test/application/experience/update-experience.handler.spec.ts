import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateExperienceHandler } from '@/application/experience/commands/update-experience/update-experience.handler';
import {
  ExperienceActor,
  UpdateExperienceCommand,
} from '@/application/experience/commands/update-experience/update-experience.command';
import {
  Experience,
  ExperienceChanges,
} from '@/domain/experience/entities/experience.entity';
import { ExperienceRepository } from '@/domain/experience/repositories/experience.repository';
import {
  ExperienceAvailabilityType,
  ExperienceAvailabilityTypeEnum,
} from '@/domain/experience/value-objects/experience-availability-type.vo';
import { ExperienceCategory } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperienceStatus } from '@/domain/experience/value-objects/experience-status.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { createExperienceRepositoryMock } from '@test/shared/mocks/repositories/experience-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { createR2StorageServiceMock } from '@test/shared/mocks/services/r2-storage.mock';

const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const OTHER_TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9ff00000000';
const EXPERIENCE_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000';
const DEFAULT_ACTOR: ExperienceActor = {
  id: 'user-123',
  email: 'host@example.com',
};

function makeExperience(overrides?: {
  tenantId?: string;
  mediaKeys?: string[];
}): Experience {
  return Experience.reconstitute({
    id: ExperienceId.create(EXPERIENCE_ID),
    tenantId: TenantId.createFromString(overrides?.tenantId ?? TENANT_ID),
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
      lat: 4.6097,
      lng: -74.0817,
    },
    availabilityType: ExperienceAvailabilityType.create(
      ExperienceAvailabilityTypeEnum.DATE_RANGE,
    ),
    startAt: new Date('2099-01-10T10:00:00.000Z'),
    endAt: new Date('2099-01-20T10:00:00.000Z'),
    recurrence: undefined,
    blackoutRanges: [],
    allowStandalonePurchase: true,
    allowReservationPurchase: true,
    minNoticeHours: 2,
    purchaseCutoffHours: 24,
    status: ExperienceStatus.create('ACTIVE'),
    mediaKeys: overrides?.mediaKeys ?? [],
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
    deletedAt: null,
  });
}

function makeCommand(overrides?: {
  experienceId?: string;
  tenantId?: string;
  changes?: ExperienceChanges;
  actor?: ExperienceActor;
}): UpdateExperienceCommand {
  return new UpdateExperienceCommand(
    overrides?.experienceId ?? EXPERIENCE_ID,
    overrides?.tenantId ?? TENANT_ID,
    overrides?.changes ?? { name: 'Updated transfer name' },
    overrides?.actor ?? DEFAULT_ACTOR,
  );
}

describe('UpdateExperienceHandler', () => {
  let handler: UpdateExperienceHandler;
  let experienceRepository: jest.Mocked<ExperienceRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;
  let r2StorageService: ReturnType<typeof createR2StorageServiceMock>;

  beforeEach(() => {
    experienceRepository = createExperienceRepositoryMock();
    eventEmitter = createEventEmitterMock();
    r2StorageService = createR2StorageServiceMock();
    r2StorageService.deleteObjects.mockResolvedValue(undefined);

    handler = new UpdateExperienceHandler(
      experienceRepository,
      eventEmitter as any,
      r2StorageService as any,
    );
  });

  it('throws when changes object is empty', () => {
    expect(
      () =>
        new UpdateExperienceCommand(
          EXPERIENCE_ID,
          TENANT_ID,
          {},
          DEFAULT_ACTOR,
        ),
    ).toThrow('UpdateExperienceCommand: changes must not be empty');
  });

  it('throws NotFoundException when experience does not exist', async () => {
    experienceRepository.findById.mockResolvedValue(null);

    await expect(handler.execute(makeCommand())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when tenant does not own the experience', async () => {
    experienceRepository.findById.mockResolvedValue(
      makeExperience({ tenantId: OTHER_TENANT_ID }),
    );

    await expect(handler.execute(makeCommand())).rejects.toThrow(
      ForbiddenException,
    );

    expect(experienceRepository.save).not.toHaveBeenCalled();
  });

  it('updates experience and emits audit event on valid update', async () => {
    experienceRepository.findById.mockResolvedValue(makeExperience());
    experienceRepository.save.mockResolvedValue(EXPERIENCE_ID);

    await handler.execute(
      makeCommand({ changes: { name: 'New transfer name' } }),
    );

    expect(experienceRepository.save).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
  });

  it('throws BadRequestException when entity validation fails', async () => {
    experienceRepository.findById.mockResolvedValue(makeExperience());

    await expect(
      handler.execute(makeCommand({ changes: { name: '' } })),
    ).rejects.toThrow(BadRequestException);

    expect(experienceRepository.save).not.toHaveBeenCalled();
  });

  it('Lymon admin updates experience belonging to their tenant', async () => {
    experienceRepository.findById.mockResolvedValue(makeExperience());
    experienceRepository.save.mockResolvedValue(EXPERIENCE_ID);

    await handler.execute(
      makeCommand({
        tenantId: TENANT_ID,
        changes: { name: 'Admin updated name' },
      }),
    );

    expect(experienceRepository.save).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
  });

  it('deletes orphaned R2 keys after save when mediaKeys is updated', async () => {
    const oldKeys = ['tenant/exp-1.jpg', 'tenant/exp-2.jpg'];
    const newKeys = ['tenant/exp-2.jpg', 'tenant/exp-3.jpg'];
    experienceRepository.findById.mockResolvedValue(
      makeExperience({ mediaKeys: oldKeys }),
    );
    experienceRepository.save.mockResolvedValue(EXPERIENCE_ID);

    await handler.execute(
      makeCommand({ changes: { mediaKeys: newKeys } }),
    );

    expect(r2StorageService.deleteObjects).toHaveBeenCalledWith(['tenant/exp-1.jpg']);
  });

  it('does not call deleteObjects when mediaKeys is not in the command', async () => {
    experienceRepository.findById.mockResolvedValue(
      makeExperience({ mediaKeys: ['tenant/exp-1.jpg'] }),
    );
    experienceRepository.save.mockResolvedValue(EXPERIENCE_ID);

    await handler.execute(makeCommand({ changes: { name: 'Updated' } }));

    expect(r2StorageService.deleteObjects).not.toHaveBeenCalled();
  });

  it('calls deleteObjects with empty array when no keys were removed', async () => {
    const keys = ['tenant/exp-1.jpg'];
    experienceRepository.findById.mockResolvedValue(
      makeExperience({ mediaKeys: keys }),
    );
    experienceRepository.save.mockResolvedValue(EXPERIENCE_ID);

    await handler.execute(makeCommand({ changes: { mediaKeys: keys } }));

    expect(r2StorageService.deleteObjects).toHaveBeenCalledWith([]);
  });
});
