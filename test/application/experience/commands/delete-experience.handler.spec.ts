import { NotFoundException } from '@nestjs/common';
import { DeleteExperienceHandler } from '@/application/experience/commands/delete-experience.handler';
import { DeleteExperienceCommand } from '@/application/experience/commands/delete-experience.command';
import { ExperienceRepository } from '@/domain/experience/repositories/experience.repository';
import { createExperienceRepositoryMock } from '@test/shared/mocks/repositories/experience-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import {
  makeExperience,
  EXPERIENCE_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/experience.fixture';

const TENANT_ID = EXPERIENCE_FIXTURE_DEFAULTS.tenantId;
const EXPERIENCE_ID = EXPERIENCE_FIXTURE_DEFAULTS.id;

function makeCommand(
  overrides?: Partial<DeleteExperienceCommand>,
): DeleteExperienceCommand {
  return new DeleteExperienceCommand(
    overrides?.experienceId ?? EXPERIENCE_ID,
    overrides?.tenantId ?? TENANT_ID,
    overrides?.actorId ?? 'user-123',
    overrides?.actorEmail ?? 'host@example.com',
  );
}

describe('DeleteExperienceHandler', () => {
  let handler: DeleteExperienceHandler;
  let experienceRepository: jest.Mocked<ExperienceRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    experienceRepository = createExperienceRepositoryMock();
    eventEmitter = createEventEmitterMock();

    handler = new DeleteExperienceHandler(
      experienceRepository,
      eventEmitter as any,
    );
  });

  describe('when experience does not exist', () => {
    it('throws NotFoundException', async () => {
      experienceRepository.findById.mockResolvedValue(null);

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        NotFoundException,
      );

      expect(experienceRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when experience belongs to another tenant', () => {
    it('throws NotFoundException', async () => {
      experienceRepository.findById.mockResolvedValue(
        makeExperience({ tenantId: 'different-tenant-id-0000000000' }),
      );

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        NotFoundException,
      );

      expect(experienceRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when all validations pass', () => {
    it('soft deletes experience and emits audit event', async () => {
      experienceRepository.findById.mockResolvedValue(makeExperience());

      await expect(handler.execute(makeCommand())).resolves.toBeUndefined();

      expect(experienceRepository.delete).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: 'user-123',
          userEmail: 'host@example.com',
          action: 'EXPERIENCE_DELETED',
          entityType: 'EXPERIENCE',
          entityId: EXPERIENCE_ID,
        }),
      );
    });
  });
});
