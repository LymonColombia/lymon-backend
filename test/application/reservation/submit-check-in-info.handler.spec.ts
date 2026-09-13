import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubmitCheckInInfoHandler } from '@/application/reservation/commands/submit-check-in-info/submit-check-in-info.handler';
import { SubmitCheckInInfoCommand } from '@/application/reservation/commands/submit-check-in-info/submit-check-in-info.command';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import {
  makeReservation,
  RESERVATION_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/reservation.fixture';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

const GUEST_ACCOUNT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9d000000000';

function makeGuestRecord(guestAccountId: string) {
  const guest = Guest.create({
    tenantId: TenantId.createFromString(RESERVATION_FIXTURE_DEFAULTS.tenantId),
    guestAccountId: GuestAccountId.createFromString(guestAccountId),
    identity: {},
    fullName: 'John Doe',
    primaryEmail: 'john@example.com',
  });

  jest
    .spyOn(guest, 'getId')
    .mockReturnValue(
      GuestId.createFromString(RESERVATION_FIXTURE_DEFAULTS.guestId),
    );

  return guest;
}

function makeTraveler(overrides?: Partial<{ fullName: string }>) {
  return {
    fullName: overrides?.fullName ?? 'John Doe',
    documentType: 'passport',
    documentNumber: 'AB123456',
    nationality: 'US',
    dateOfBirth: null,
    phone: null,
  };
}

describe('SubmitCheckInInfoHandler', () => {
  let handler: SubmitCheckInInfoHandler;
  let reservationRepository: ReturnType<typeof createReservationRepositoryMock>;
  let guestRepository: ReturnType<typeof createGuestRepositoryMock>;

  beforeEach(() => {
    reservationRepository = createReservationRepositoryMock();
    guestRepository = createGuestRepositoryMock();
    handler = new SubmitCheckInInfoHandler(
      reservationRepository as any,
      guestRepository as any,
    );
  });

  it('saves check-in info on a CONFIRMED reservation', async () => {
    const reservation = makeReservation({ guestsCount: 2 });
    const guest = makeGuestRecord(GUEST_ACCOUNT_ID);
    const travelers = [
      makeTraveler({ fullName: 'John Doe' }),
      makeTraveler({ fullName: 'Jane Doe' }),
    ];

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(guest as any);
    reservationRepository.save.mockResolvedValue(
      RESERVATION_FIXTURE_DEFAULTS.id,
    );

    await handler.execute(
      new SubmitCheckInInfoCommand(
        RESERVATION_FIXTURE_DEFAULTS.id,
        GUEST_ACCOUNT_ID,
        travelers,
      ),
    );

    expect(reservationRepository.save).toHaveBeenCalledTimes(1);
    const saved = reservationRepository.save.mock.calls[0][0];
    expect(saved.getCheckInInfo()).toHaveLength(2);
    expect(saved.getCheckInInfo()[0].fullName).toBe('John Doe');
    expect(saved.getCheckInInfo()[1].fullName).toBe('Jane Doe');
  });

  it('allows check-in info on a CHECKED_IN reservation', async () => {
    const reservation = makeReservation({
      status: ReservationStatusEnum.CHECKED_IN,
      guestsCount: 1,
    });
    const guest = makeGuestRecord(GUEST_ACCOUNT_ID);

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(guest as any);
    reservationRepository.save.mockResolvedValue(
      RESERVATION_FIXTURE_DEFAULTS.id,
    );

    await handler.execute(
      new SubmitCheckInInfoCommand(
        RESERVATION_FIXTURE_DEFAULTS.id,
        GUEST_ACCOUNT_ID,
        [makeTraveler()],
      ),
    );

    expect(reservationRepository.save).toHaveBeenCalledTimes(1);
  });

  it('replaces previous check-in info when called again', async () => {
    const reservation = makeReservation({ guestsCount: 2 });
    reservation.setCheckInInfo([
      makeTraveler({ fullName: 'Old Name' }),
      makeTraveler({ fullName: 'Old Name 2' }),
    ]);

    const guest = makeGuestRecord(GUEST_ACCOUNT_ID);

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(guest as any);
    reservationRepository.save.mockResolvedValue(
      RESERVATION_FIXTURE_DEFAULTS.id,
    );

    await handler.execute(
      new SubmitCheckInInfoCommand(
        RESERVATION_FIXTURE_DEFAULTS.id,
        GUEST_ACCOUNT_ID,
        [makeTraveler({ fullName: 'New Name' })],
      ),
    );

    const saved = reservationRepository.save.mock.calls[0][0];
    expect(saved.getCheckInInfo()).toHaveLength(1);
    expect(saved.getCheckInInfo()[0].fullName).toBe('New Name');
  });

  it('throws NotFoundException when reservation does not exist', async () => {
    reservationRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new SubmitCheckInInfoCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9ff00000000',
          GUEST_ACCOUNT_ID,
          [makeTraveler()],
        ),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when guest does not own the reservation', async () => {
    const reservation = makeReservation();
    const differentAccountGuest = makeGuestRecord('different-account-id');

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(differentAccountGuest as any);

    await expect(
      handler.execute(
        new SubmitCheckInInfoCommand(
          RESERVATION_FIXTURE_DEFAULTS.id,
          GUEST_ACCOUNT_ID,
          [makeTraveler()],
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when guest record has no linked account', async () => {
    const reservation = makeReservation();
    const guest = Guest.create({
      tenantId: TenantId.createFromString(
        RESERVATION_FIXTURE_DEFAULTS.tenantId,
      ),
      identity: {},
      fullName: 'No Account Guest',
      primaryEmail: 'noaccnt@example.com',
    });
    jest
      .spyOn(guest, 'getId')
      .mockReturnValue(
        GuestId.createFromString(RESERVATION_FIXTURE_DEFAULTS.guestId),
      );

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(guest as any);

    await expect(
      handler.execute(
        new SubmitCheckInInfoCommand(
          RESERVATION_FIXTURE_DEFAULTS.id,
          GUEST_ACCOUNT_ID,
          [makeTraveler()],
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws DomainException when reservation is PENDING', async () => {
    const reservation = makeReservation({
      status: ReservationStatusEnum.PENDING,
      guestsCount: 1,
    });
    const guest = makeGuestRecord(GUEST_ACCOUNT_ID);

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(guest as any);

    await expect(
      handler.execute(
        new SubmitCheckInInfoCommand(
          RESERVATION_FIXTURE_DEFAULTS.id,
          GUEST_ACCOUNT_ID,
          [makeTraveler()],
        ),
      ),
    ).rejects.toThrow(DomainException);
  });

  it('throws DomainException when reservation is CANCELLED', async () => {
    const reservation = makeReservation({
      status: ReservationStatusEnum.CANCELLED,
      guestsCount: 1,
    });
    const guest = makeGuestRecord(GUEST_ACCOUNT_ID);

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(guest as any);

    await expect(
      handler.execute(
        new SubmitCheckInInfoCommand(
          RESERVATION_FIXTURE_DEFAULTS.id,
          GUEST_ACCOUNT_ID,
          [makeTraveler()],
        ),
      ),
    ).rejects.toThrow(DomainException);
  });

  it('throws DomainException when traveler count exceeds guestsCount', async () => {
    const reservation = makeReservation({ guestsCount: 1 });
    const guest = makeGuestRecord(GUEST_ACCOUNT_ID);

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(guest as any);

    await expect(
      handler.execute(
        new SubmitCheckInInfoCommand(
          RESERVATION_FIXTURE_DEFAULTS.id,
          GUEST_ACCOUNT_ID,
          [
            makeTraveler({ fullName: 'One' }),
            makeTraveler({ fullName: 'Two' }),
          ],
        ),
      ),
    ).rejects.toThrow(DomainException);
  });
});
