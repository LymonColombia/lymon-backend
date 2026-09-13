import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUnitRatingHandler } from '@/application/unit-rating/commands/create-unit-rating/create-unit-rating.handler';
import { CreateUnitRatingCommand } from '@/application/unit-rating/commands/create-unit-rating/create-unit-rating.command';
import { UnitRatingRepository } from '@/domain/unit-rating/repositories/unit-rating.repository';
import { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { ReservationRepository } from '@/domain/reservation/repositories/reservation.repository';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { createUnitRatingRepositoryMock } from '@test/shared/mocks/repositories/unit-rating-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import {
  makeReservation,
  RESERVATION_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/reservation.fixture';
import {
  makeGuest,
  GUEST_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest.fixture';
import { Unit } from '@/domain/unit/entities/unit.entity';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

const TENANT_ID = RESERVATION_FIXTURE_DEFAULTS.tenantId;
const UNIT_ID = RESERVATION_FIXTURE_DEFAULTS.unitId;
const GUEST_ID = GUEST_FIXTURE_DEFAULTS.id;
const RESERVATION_ID = RESERVATION_FIXTURE_DEFAULTS.id;
const GUEST_ACCOUNT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b90100000000';

function makeUnitFixture(
  overrides?: Partial<{ tenantId: string; id: string }>,
): Unit {
  return Unit.reconstitute({
    id: UnitId.create(overrides?.id ?? UNIT_ID),
    tenantId: TenantId.createFromString(overrides?.tenantId ?? TENANT_ID),
    propertyId: PropertyId.create(RESERVATION_FIXTURE_DEFAULTS.propertyId),
    basicInfo: { name: 'Test Unit', description: 'A test unit' },
    inventoryConfig: { inventoryCount: 1 },
    capacityConfig: { maxGuests: 2, standardGuests: 2 },
    physicalFeatures: { bedrooms: [], bathroomsCount: 1, isShared: false },
    pricingConfig: { pricePerNight: 100 },
    amenities: [],
    externalIds: ExternalIds.create(),
    timestamps: { createdAt: new Date(), updatedAt: new Date() },
  });
}

describe('CreateUnitRatingHandler', () => {
  let handler: CreateUnitRatingHandler;
  let unitRatingRepository: jest.Mocked<UnitRatingRepository>;
  let unitRepository: jest.Mocked<UnitRepository>;
  let reservationRepository: jest.Mocked<ReservationRepository>;
  let guestRepository: jest.Mocked<GuestRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const defaultCommand = new CreateUnitRatingCommand(
    GUEST_ACCOUNT_ID,
    'guest@example.com',
    RESERVATION_ID,
    4,
    'Great stay!',
  );

  beforeEach(() => {
    unitRatingRepository = createUnitRatingRepositoryMock();
    unitRepository = createUnitRepositoryMock();
    reservationRepository = createReservationRepositoryMock();
    guestRepository = createGuestRepositoryMock();
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    handler = new CreateUnitRatingHandler(
      unitRatingRepository,
      unitRepository,
      reservationRepository,
      guestRepository,
      eventEmitter,
    );
  });

  describe('Happy path', () => {
    it('creates rating, updates unit average, and emits audit event', async () => {
      const reservation = makeReservation({
        guestId: GUEST_ID,
        status: ReservationStatusEnum.CHECKED_OUT,
      });
      const guest = makeGuest({ id: GUEST_ID, tenantId: TENANT_ID });
      jest
        .spyOn(guest, 'getId')
        .mockReturnValue(GuestId.createFromString(GUEST_ID));

      reservationRepository.findById.mockResolvedValue(reservation);
      guestRepository.findByGuestAccountId.mockResolvedValue(guest);
      unitRatingRepository.findByReservationId.mockResolvedValue(null);
      unitRepository.findById.mockResolvedValue(makeUnitFixture());
      unitRatingRepository.save.mockResolvedValue('new-rating-id');
      unitRatingRepository.calculateAverageForUnit.mockResolvedValue(4);
      unitRepository.save.mockResolvedValue('unit-id');

      const result = await handler.execute(defaultCommand);

      expect(result.unitRatingId).toBe('new-rating-id');
      expect(unitRatingRepository.save).toHaveBeenCalledTimes(1);
      expect(unitRepository.save).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);

      const savedRating = unitRatingRepository.save.mock.calls[0][0];
      expect(savedRating.getRate()).toBe(4);
      expect(savedRating.getMessage()).toBe('Great stay!');
    });
  });

  describe('Error cases', () => {
    it('throws NotFoundException when reservation not found', async () => {
      reservationRepository.findById.mockResolvedValue(null);

      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws DomainException when reservation is not CHECKED_OUT', async () => {
      const reservation = makeReservation({
        guestId: GUEST_ID,
        status: ReservationStatusEnum.CONFIRMED,
      });
      reservationRepository.findById.mockResolvedValue(reservation);
      const guest = makeGuest({ id: GUEST_ID, tenantId: TENANT_ID });
      jest
        .spyOn(guest, 'getId')
        .mockReturnValue(GuestId.createFromString(GUEST_ID));
      guestRepository.findByGuestAccountId.mockResolvedValue(guest);

      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        DomainException,
      );
      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        'Ratings can only be submitted after checkout',
      );
    });

    it('throws NotFoundException when guest profile not found', async () => {
      const reservation = makeReservation({
        guestId: GUEST_ID,
        status: ReservationStatusEnum.CHECKED_OUT,
      });
      reservationRepository.findById.mockResolvedValue(reservation);
      guestRepository.findByGuestAccountId.mockResolvedValue(null);

      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws DomainException when guest does not match reservation', async () => {
      const reservation = makeReservation({
        guestId: GUEST_ID,
        status: ReservationStatusEnum.CHECKED_OUT,
      });
      const otherGuest = makeGuest({
        id: '65f1a1a2-b3c4-d5e6-f7a8-b9ff00000000',
        tenantId: TENANT_ID,
      });
      jest
        .spyOn(otherGuest, 'getId')
        .mockReturnValue(GuestId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9ff00000000'));
      reservationRepository.findById.mockResolvedValue(reservation);
      guestRepository.findByGuestAccountId.mockResolvedValue(otherGuest);

      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        DomainException,
      );
      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        'This reservation does not belong to the authenticated guest',
      );
    });

    it('throws ConflictException when rating already exists for reservation', async () => {
      const reservation = makeReservation({
        guestId: GUEST_ID,
        status: ReservationStatusEnum.CHECKED_OUT,
      });
      const guest = makeGuest({ id: GUEST_ID, tenantId: TENANT_ID });
      jest
        .spyOn(guest, 'getId')
        .mockReturnValue(GuestId.createFromString(GUEST_ID));
      const existingRating = {
        getId: () => ({ toString: () => 'existing-id' }),
      } as any;

      reservationRepository.findById.mockResolvedValue(reservation);
      guestRepository.findByGuestAccountId.mockResolvedValue(guest);
      unitRatingRepository.findByReservationId.mockResolvedValue(
        existingRating,
      );

      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        ConflictException,
      );
      await expect(handler.execute(defaultCommand)).rejects.toThrow(
        'A rating for this reservation already exists',
      );
    });
  });
});
