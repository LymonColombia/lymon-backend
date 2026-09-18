import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeletePropertyHandler } from '@/application/property/commands/delete-property.handler';
import { DeletePropertyCommand } from '@/application/property/commands/delete-property.command';
import { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { ReservationRepository } from '@/domain/reservation/repositories/reservation.repository';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { makeProperty } from '@test/shared/fixtures/property.fixture';

describe('DeletePropertyHandler', () => {
  let handler: DeletePropertyHandler;
  let propertyRepository: jest.Mocked<PropertyRepository>;
  let reservationRepository: jest.Mocked<ReservationRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    propertyRepository = createPropertyRepositoryMock();
    reservationRepository = createReservationRepositoryMock();
    eventEmitter = createEventEmitterMock();

    handler = new DeletePropertyHandler(
      propertyRepository,
      reservationRepository,
      eventEmitter as any,
    );
  });

  describe('when property does not exist', () => {
    it('throws NotFoundException', async () => {
      propertyRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(
          new DeletePropertyCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            'user-123',
            'user@example.com',
          ),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        reservationRepository.existsActiveByPropertyId,
      ).not.toHaveBeenCalled();
      expect(propertyRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when property belongs to another tenant', () => {
    it('throws NotFoundException', async () => {
      propertyRepository.findById.mockResolvedValue(
        makeProperty({ tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000' }),
      );

      await expect(
        handler.execute(
          new DeletePropertyCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            'user-123',
            'user@example.com',
          ),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        reservationRepository.existsActiveByPropertyId,
      ).not.toHaveBeenCalled();
      expect(propertyRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when property has active reservations', () => {
    it('throws ForbiddenException', async () => {
      propertyRepository.findById.mockResolvedValue(makeProperty());
      reservationRepository.existsActiveByPropertyId.mockResolvedValue(true);

      await expect(
        handler.execute(
          new DeletePropertyCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            'user-123',
            'user@example.com',
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(propertyRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('when all validations pass', () => {
    it('soft deletes property and emits audit event', async () => {
      propertyRepository.findById.mockResolvedValue(makeProperty());
      reservationRepository.existsActiveByPropertyId.mockResolvedValue(false);

      await expect(
        handler.execute(
          new DeletePropertyCommand(
            '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
            'user-123',
            'user@example.com',
          ),
        ),
      ).resolves.toBeUndefined();

      expect(propertyRepository.delete).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          userId: 'user-123',
          userEmail: 'user@example.com',
          action: 'PROPERTY_DELETED',
          entityType: 'PROPERTY',
          entityId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
        }),
      );
    });
  });
});
