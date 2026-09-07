import { GetGuestReservationsHandler } from '@/application/reservation/queries/get-guest-reservations/get-guest-reservations.query-handler';
import { GetGuestReservationsQuery } from '@/application/reservation/queries/get-guest-reservations/get-guest-reservations.query';
import { GetGuestReservationsResult } from '@/application/reservation/queries/get-guest-reservations/get-guest-reservations.result';
import { createGuestReservationsReadRepositoryMock } from '@test/shared/mocks/repositories/guest-reservations-read-repository.mock';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { makeReservation } from '@test/shared/fixtures/reservation.fixture';
import { makeProperty } from '@test/shared/fixtures/property.fixture';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';

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

describe('GetGuestReservationsHandler', () => {
  const GUEST_1_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000';
  const GUEST_2_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c600000000';

  let handler: GetGuestReservationsHandler;
  let guestReservationsReadRepository: ReturnType<
    typeof createGuestReservationsReadRepositoryMock
  >;
  let guestRepository: ReturnType<typeof createGuestRepositoryMock>;
  let propertyRepository: ReturnType<typeof createPropertyRepositoryMock>;
  let unitRepository: ReturnType<typeof createUnitRepositoryMock>;

  beforeEach(() => {
    guestReservationsReadRepository =
      createGuestReservationsReadRepositoryMock();
    guestRepository = createGuestRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();
    unitRepository = createUnitRepositoryMock();

    handler = new GetGuestReservationsHandler(
      guestReservationsReadRepository as any,
      guestRepository as any,
      propertyRepository as any,
      unitRepository as any,
    );
  });

  it('returns paginated bookings for the guest account', async () => {
    const guestAccountId = '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000';
    const guest1 = makeGuestRecord({
      id: GUEST_1_ID,
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      guestAccountId,
    });
    const guest2 = makeGuestRecord({
      id: GUEST_2_ID,
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000',
      guestAccountId,
    });

    guestRepository.findAllByGuestAccountId.mockResolvedValue([
      guest1,
      guest2,
    ] as any);

    const booking1 = makeReservation({
      id: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      guestId: GUEST_1_ID,
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
      unitId: '65f1a1a2-b3c4-d5e6-f7a8-b9c800000000',
      status: ReservationStatusEnum.CONFIRMED,
    });
    const booking2 = makeReservation({
      id: 'res-2',
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000',
      guestId: GUEST_2_ID,
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9cd00000000',
      unitId: '65f1a1a2-b3c4-d5e6-f7a8-b9cf00000000',
      status: ReservationStatusEnum.CHECKED_IN,
    });
    const booking3 = makeReservation({
      id: 'res-3',
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000',
      guestId: GUEST_2_ID,
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9cd00000000',
      unitId: '65f1a1a2-b3c4-d5e6-f7a8-b9cf00000000',
      status: ReservationStatusEnum.CHECKED_OUT,
    });

    guestReservationsReadRepository.findByGuestIds.mockResolvedValue([
      booking1,
      booking2,
      booking3,
    ] as any);
    guestReservationsReadRepository.countByGuestIds.mockResolvedValue(3 as any);
    propertyRepository.findByTenantId.mockImplementation((tenantId) => {
      if (tenantId.toString() === '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000') {
        return Promise.resolve([
          makeProperty({
            id: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
            tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          }),
        ]);
      }

      return Promise.resolve([
        makeProperty({
          id: '65f1a1a2-b3c4-d5e6-f7a8-b9cd00000000',
          tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000',
        }),
      ]);
    });
    unitRepository.findByTenantId.mockImplementation(() => Promise.resolve([]));

    const result = await handler.execute(
      new GetGuestReservationsQuery(
        guestAccountId,
        1,
        10,
        undefined,
        undefined,
        undefined,
        'createdAt',
        'desc',
      ),
    );

    expect(result).toBeInstanceOf(GetGuestReservationsResult);
    expect(guestRepository.findAllByGuestAccountId).toHaveBeenCalledTimes(1);
    expect(guestReservationsReadRepository.findByGuestIds).toHaveBeenCalledWith(
      [GUEST_1_ID, GUEST_2_ID],
      expect.objectContaining({ page: 1, limit: 10, sortBy: 'createdAt' }),
    );
    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({
      id: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
      bookingReference: '1',
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
      status: ReservationStatusEnum.CONFIRMED,
    });
    expect(result.items[1]).toMatchObject({
      id: 'res-2',
      bookingReference: '1',
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9cd00000000',
      status: ReservationStatusEnum.CHECKED_IN,
    });
    expect(result.items[2]).toMatchObject({
      id: 'res-3',
      bookingReference: '1',
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9cd00000000',
      status: ReservationStatusEnum.CHECKED_OUT,
    });
  });

  it('returns empty results when the guest account has no guest records', async () => {
    guestRepository.findAllByGuestAccountId.mockResolvedValue([] as any);

    const result = await handler.execute(
      new GetGuestReservationsQuery('65f1a1a2-b3c4-d5e6-f7a8-b9c500000000', 1, 10),
    );

    expect(result).toEqual(new GetGuestReservationsResult([], 0, 1, 10));
    expect(
      guestReservationsReadRepository.findByGuestIds,
    ).not.toHaveBeenCalled();
    expect(
      guestReservationsReadRepository.countByGuestIds,
    ).not.toHaveBeenCalled();
    expect(propertyRepository.findByTenantId).not.toHaveBeenCalled();
    expect(unitRepository.findByTenantId).not.toHaveBeenCalled();
  });
});
