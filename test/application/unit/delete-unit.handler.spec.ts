import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteUnitHandler } from '@/application/unit/commands/delete-unit.handler';
import { DeleteUnitCommand } from '@/application/unit/commands/delete-unit.command';
import { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { ReservationRepository } from '@/domain/reservation/repositories/reservation.repository';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { Unit } from '@/domain/unit/entities/unit.entity';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';

const UNIT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c800000000';
const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const PROPERTY_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000';

function makeUnit(overrides?: Partial<{ tenantId: string; id: string }>): Unit {
  return Unit.reconstitute({
    id: UnitId.create(overrides?.id ?? UNIT_ID),
    tenantId: TenantId.createFromString(overrides?.tenantId ?? TENANT_ID),
    propertyId: PropertyId.create(PROPERTY_ID),
    basicInfo: { name: 'Unit Name', description: 'Unit Description' },
    inventoryConfig: { inventoryCount: 1 },
    capacityConfig: { maxGuests: 4, standardGuests: 2 },
    physicalFeatures: { bedrooms: [], bathroomsCount: 1, isShared: false },
    pricingConfig: { pricePerNight: 100 },
    amenities: ['wifi'],
    externalIds: ExternalIds.create(),
    timestamps: { createdAt: new Date(), updatedAt: new Date() },
  });
}

describe('DeleteUnitHandler', () => {
  let handler: DeleteUnitHandler;
  let unitRepository: jest.Mocked<UnitRepository>;
  let reservationRepository: jest.Mocked<ReservationRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(() => {
    unitRepository = createUnitRepositoryMock();
    reservationRepository = createReservationRepositoryMock();
    reservationRepository.existsActiveByUnitId.mockResolvedValue(false);
    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    handler = new DeleteUnitHandler(
      unitRepository,
      reservationRepository,
      eventEmitter,
    );
  });

  describe('when unit does not exist', () => {
    it('throws NotFoundException', async () => {
      unitRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new DeleteUnitCommand(TENANT_ID, UNIT_ID)),
      ).rejects.toThrow(NotFoundException);

      expect(reservationRepository.existsActiveByUnitId).not.toHaveBeenCalled();
      expect(unitRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when unit belongs to another tenant', () => {
    it('throws NotFoundException', async () => {
      unitRepository.findById.mockResolvedValue(
        makeUnit({ tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000' }),
      );

      await expect(
        handler.execute(new DeleteUnitCommand(TENANT_ID, UNIT_ID)),
      ).rejects.toThrow(NotFoundException);

      expect(reservationRepository.existsActiveByUnitId).not.toHaveBeenCalled();
      expect(unitRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when unit has active reservations', () => {
    it('throws ForbiddenException', async () => {
      unitRepository.findById.mockResolvedValue(makeUnit());
      reservationRepository.existsActiveByUnitId.mockResolvedValue(true);

      await expect(
        handler.execute(new DeleteUnitCommand(TENANT_ID, UNIT_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(unitRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when unit exists and belongs to tenant', () => {
    it('deletes unit successfully', async () => {
      unitRepository.findById.mockResolvedValue(makeUnit());

      await expect(
        handler.execute(new DeleteUnitCommand(TENANT_ID, UNIT_ID)),
      ).resolves.toBeUndefined();

      expect(unitRepository.delete).toHaveBeenCalledTimes(1);
      expect(unitRepository.delete).toHaveBeenCalledWith(
        expect.objectContaining({}),
      );
    });

    it('emits audit event when actor info is present', async () => {
      unitRepository.findById.mockResolvedValue(makeUnit());

      await handler.execute(
        new DeleteUnitCommand(
          TENANT_ID,
          UNIT_ID,
          'actor-1',
          'actor@example.com',
        ),
      );

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('does not emit audit event without actor info', async () => {
      unitRepository.findById.mockResolvedValue(makeUnit());

      await handler.execute(new DeleteUnitCommand(TENANT_ID, UNIT_ID));

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
