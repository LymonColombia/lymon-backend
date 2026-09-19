import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GuestReservationController } from '@/presentation/controllers/guest-reservation.controller';
import { GetGuestReservationsQuery } from '@/application/reservation/queries/get-guest-reservations/get-guest-reservations.query';
import { GetGuestReservationQuery } from '@/application/reservation/queries/get-guest-reservation/get-guest-reservation.query';
import { GetGuestReservationsResult } from '@/application/reservation/queries/get-guest-reservations/get-guest-reservations.result';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';

describe('GuestReservationController', () => {
  let controller: GuestReservationController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  const guest = {
    guestAccountId: '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000',
    email: 'guest@example.com',
  } as any;

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    controller = new GuestReservationController(
      queryBus as unknown as QueryBus,
      commandBus as unknown as CommandBus,
    );
  });

  it('lists guest bookings with pagination and filters', async () => {
    queryBus.execute.mockResolvedValue(
      new GetGuestReservationsResult([], 0, 1, 20),
    );

    const queryParams = {
      page: '2',
      limit: '15',
      status: 'checked_in',
      fromDate: '2026-01-01',
      toDate: '2026-02-01',
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };

    const result = await controller.findAll(guest, queryParams);

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetGuestReservationsQuery),
    );
    const [query] = queryBus.execute.mock.calls[0] as [
      GetGuestReservationsQuery,
    ];
    expect(query).toMatchObject({
      guestAccountId: '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000',
      page: 2,
      limit: 15,
      statuses: [ReservationStatusEnum.CHECKED_IN],
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(result).toEqual(new GetGuestReservationsResult([], 0, 1, 20));
  });

  it('opens booking detail for the authenticated guest account', async () => {
    queryBus.execute.mockResolvedValue({ id: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000' });

    const result = await controller.findOne(guest, '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000');

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetGuestReservationQuery),
    );
    const query = queryBus.execute.mock.calls[0][0] as GetGuestReservationQuery;
    expect(query).toMatchObject({
      reservationId: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
      guestAccountId: '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000',
    });
    expect(result).toEqual({ id: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000' });
  });
});
