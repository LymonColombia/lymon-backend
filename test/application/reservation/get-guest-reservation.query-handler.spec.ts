import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetGuestReservationHandler } from '@/application/reservation/queries/get-guest-reservation/get-guest-reservation.query-handler';
import { GetGuestReservationQuery } from '@/application/reservation/queries/get-guest-reservation/get-guest-reservation.query';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { makeReservation } from '@test/shared/fixtures/reservation.fixture';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

function makeGuestRecord(params: {
  id: string;
  tenantId: string;
  guestAccountId: string;
}) {
  const guest = Guest.create({
    tenantId: TenantId.createFromString(params.tenantId),
    guestAccountId: GuestAccountId.createFromString(params.guestAccountId),
    identity: {},
    fullName: 'John Doe',
    primaryEmail: `john+${params.id}@example.com`,
  });

  jest
    .spyOn(guest, 'getId')
    .mockReturnValue(GuestId.createFromString(params.id));

  return guest;
}

describe('GetGuestReservationHandler', () => {
  const GUEST_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000';

  let handler: GetGuestReservationHandler;
  let reservationRepository: ReturnType<typeof createReservationRepositoryMock>;
  let guestRepository: ReturnType<typeof createGuestRepositoryMock>;
  let propertyRepository: ReturnType<typeof createPropertyRepositoryMock>;
  let unitRepository: ReturnType<typeof createUnitRepositoryMock>;

  beforeEach(() => {
    reservationRepository = createReservationRepositoryMock();
    guestRepository = createGuestRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();
    unitRepository = createUnitRepositoryMock();

    const refundRequestRepository = {
      findByReservationId: jest.fn().mockResolvedValue(null),
    };

    handler = new GetGuestReservationHandler(
      reservationRepository as any,
      guestRepository as any,
      propertyRepository as any,
      unitRepository as any,
      refundRequestRepository as any,
    );
  });

  it('returns booking detail for the authenticated guest account', async () => {
    const reservation = makeReservation({
      id: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      guestId: GUEST_ID,
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
      unitId: '65f1a1a2-b3c4-d5e6-f7a8-b9c800000000',
    });
    const guest = makeGuestRecord({
      id: GUEST_ID,
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      guestAccountId: '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000',
    });

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(guest as any);
    propertyRepository.findById.mockResolvedValue({
      getName: () => 'Casa del lago',
    } as any);
    unitRepository.findById.mockResolvedValue({
      getName: () => 'Ocean View Suite',
    } as any);

    const result = await handler.execute(
      new GetGuestReservationQuery(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
        '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000',
      ),
    );

    expect(result).toMatchObject({
      id: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
      bookingReference: '1',
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
      propertyName: 'Casa del lago',
      unitId: '65f1a1a2-b3c4-d5e6-f7a8-b9c800000000',
      unitName: 'Ocean View Suite',
      serviceName: 'Ocean View Suite',
      notes: null,
      source: 'DIRECT',
      priceBreakdown: {
        pricePerNight: 100,
        nights: 4,
        totalPrice: 400,
      },
    });
  });

  it('throws NotFoundException when booking does not exist', async () => {
    reservationRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new GetGuestReservationQuery(
          '65f1a1a2-b3c4-d5e6-f7a8-b9cf00000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000',
        ),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when booking belongs to another guest account', async () => {
    const reservation = makeReservation({
      id: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      guestId: GUEST_ID,
    });
    const guest = makeGuestRecord({
      id: GUEST_ID,
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      guestAccountId: 'different-account',
    });

    reservationRepository.findById.mockResolvedValue(reservation as any);
    guestRepository.findById.mockResolvedValue(guest as any);

    await expect(
      handler.execute(
        new GetGuestReservationQuery(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000',
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
