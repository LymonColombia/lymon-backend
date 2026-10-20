import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdatePropertyHandler } from '@/application/property/commands/update-property.handler';
import { UpdatePropertyCommand } from '@/application/property/commands/update-property.command';
import { UpdatePropertyResult } from '@/application/property/commands/update-property.result';
import { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import {
  makeProperty,
  PROPERTY_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/property.fixture';

describe('UpdatePropertyHandler', () => {
  let handler: UpdatePropertyHandler;
  let propertyRepository: jest.Mocked<PropertyRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  function makeCommand(
    overrides?: Partial<UpdatePropertyCommand>,
  ): UpdatePropertyCommand {
    return new UpdatePropertyCommand(
      overrides?.tenantId ?? PROPERTY_FIXTURE_DEFAULTS.tenantId,
      overrides?.propertyId ?? PROPERTY_FIXTURE_DEFAULTS.id,
      overrides?.name,
      overrides?.description,
      overrides?.address,
      overrides?.city,
      overrides?.state,
      overrides?.country,
      overrides?.zipCode,
      overrides?.location,
      overrides?.checkInTime,
      overrides?.checkOutTime,
      overrides?.cancellationPolicy,
      overrides?.hostPhone,
      overrides?.hostEmail,
      overrides?.actorId ?? '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
      overrides?.actorEmail ?? 'owner@example.com',
    );
  }

  beforeEach(() => {
    propertyRepository = createPropertyRepositoryMock();
    eventEmitter = createEventEmitterMock();

    handler = new UpdatePropertyHandler(
      propertyRepository,
      eventEmitter as any,
      { getPublicUrl: (k: string) => k } as any,
    );
  });

  describe('when no fields are provided', () => {
    it('throws BadRequestException', async () => {
      await expect(handler.execute(makeCommand())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('when property does not exist', () => {
    it('throws NotFoundException', async () => {
      propertyRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(makeCommand({ name: 'Casa renovada' })),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('when property belongs to a different tenant', () => {
    it('throws NotFoundException', async () => {
      propertyRepository.findById.mockResolvedValue(
        makeProperty({ tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000' }),
      );

      await expect(
        handler.execute(makeCommand({ name: 'Casa renovada' })),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('when update is successful', () => {
    it('updates and saves property, then emits audit event', async () => {
      propertyRepository.findById.mockResolvedValue(makeProperty());
      propertyRepository.save.mockResolvedValue(PROPERTY_FIXTURE_DEFAULTS.id);

      const result = await handler.execute(
        makeCommand({
          name: 'Casa del lago premium',
          city: 'Medellín',
          checkOutTime: '12:00',
          cancellationPolicy: 'STANDARD',
          hostPhone: '+573009876543',
        }),
      );

      expect(result).toBeInstanceOf(UpdatePropertyResult);
      expect(result.propertyId).toBe(PROPERTY_FIXTURE_DEFAULTS.id);
      expect(propertyRepository.save).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ entityType: 'PROPERTY' }),
      );
    });
  });
});
