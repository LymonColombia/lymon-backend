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
import { Property } from '@/domain/property/entities/property.entity';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { PropertyType, PropertyTypeEnum } from '@/domain/property/value-objects/property-type.vo';
import { CancellationPolicy, CancellationPolicyEnum } from '@/domain/property/value-objects/cancellation-policy.vo';
import { Location } from '@/domain/property/value-objects/location.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ChannexSyncStatus } from '@/domain/property/value-objects/channex-sync-status.vo';
import { CHANNEX_PROPERTY_UPDATE_EVENT } from '@/infrastructure/channex/events/channex-property-update.event';

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

    it('emits Channex update event when property has channexId', async () => {
      const syncedProperty = Property.reconstitute({
        id: PropertyId.create(PROPERTY_FIXTURE_DEFAULTS.id),
        tenantId: TenantId.createFromString(PROPERTY_FIXTURE_DEFAULTS.tenantId),
        name: PROPERTY_FIXTURE_DEFAULTS.name,
        description: PROPERTY_FIXTURE_DEFAULTS.description,
        propertyType: PropertyType.create(PropertyTypeEnum.CASA),
        address: PROPERTY_FIXTURE_DEFAULTS.address,
        city: PROPERTY_FIXTURE_DEFAULTS.city,
        state: PROPERTY_FIXTURE_DEFAULTS.state,
        country: PROPERTY_FIXTURE_DEFAULTS.country,
        zipCode: PROPERTY_FIXTURE_DEFAULTS.zipCode,
        location: Location.create(
          PROPERTY_FIXTURE_DEFAULTS.location.lat,
          PROPERTY_FIXTURE_DEFAULTS.location.lng,
        ),
        checkInTime: PROPERTY_FIXTURE_DEFAULTS.checkInTime,
        checkOutTime: PROPERTY_FIXTURE_DEFAULTS.checkOutTime,
        cancellationPolicy: CancellationPolicy.create(
          CancellationPolicyEnum.FLEXIBLE,
        ),
        hostPhone: PROPERTY_FIXTURE_DEFAULTS.hostPhone,
        hostEmail: PROPERTY_FIXTURE_DEFAULTS.hostEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        channexId: 'channex-abc-123',
        channexSyncStatus: ChannexSyncStatus.create('SYNCED'),
      });

      propertyRepository.findById.mockResolvedValue(syncedProperty);
      propertyRepository.save.mockResolvedValue(PROPERTY_FIXTURE_DEFAULTS.id);

      await handler.execute(makeCommand({ name: 'Casa renovada' }));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        CHANNEX_PROPERTY_UPDATE_EVENT,
        expect.objectContaining({ channexId: 'channex-abc-123' }),
      );
    });
  });
});
