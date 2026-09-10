import { Test } from '@nestjs/testing';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';
import {
  GetGuestStatsQuery,
  GUEST_STAT_KEYS,
} from '@/application/guest/queries/get-guest-stats/get-guest-stats.query';
import { GetGuestStatsHandler } from '@/application/guest/queries/get-guest-stats/get-guest-stats.handler';
import { GetGuestMonthlySpendingHandler } from '@/application/guest/queries/get-guest-monthly-spending/get-guest-monthly-spending.handler';
import { GetGuestBookingOriginsHandler } from '@/application/guest/queries/get-guest-booking-origins/get-guest-booking-origins.handler';
import { GetGuestRecencyHandler } from '@/application/guest/queries/get-guest-recency/get-guest-recency.handler';
import { RESERVATION_REPOSITORY } from '@/domain/reservation/repositories/reservation.repository';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';

// Guards the catalog↔handler wiring: every key in GUEST_STAT_KEYS must dispatch to a
// resolvable handler through the real bus. Add a stat to the catalog without registering
// its handler here (and in guest-application.module) and this fails with "No handler found".
describe('GetGuestStatsHandler — stat catalog wiring', () => {
  let queryBus: QueryBus;

  beforeEach(async () => {
    const reservationRepository = createReservationRepositoryMock();
    reservationRepository.getMonthlySpendingByGuestId.mockResolvedValue([]);
    reservationRepository.countByGuestIdGroupedBySource.mockResolvedValue([]);
    reservationRepository.getLastStayAt.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        GetGuestStatsHandler,
        GetGuestMonthlySpendingHandler,
        GetGuestBookingOriginsHandler,
        GetGuestRecencyHandler,
        { provide: RESERVATION_REPOSITORY, useValue: reservationRepository },
      ],
    }).compile();

    await moduleRef.init();
    queryBus = moduleRef.get(QueryBus);
  });

  it('resolves every catalog key to a handler and returns a value for each', async () => {
    const data = await queryBus.execute<
      GetGuestStatsQuery,
      Record<string, unknown>
    >(
      new GetGuestStatsQuery(
        '65f1a1a2b3c4d5e6f7a8b9c0',
        '65f1a1a2b3c4d5e6f7a8b9c1',
        GUEST_STAT_KEYS,
      ),
    );

    for (const key of GUEST_STAT_KEYS) {
      expect(data).toHaveProperty(key);
    }
    expect(Object.keys(data)).toHaveLength(GUEST_STAT_KEYS.length);
  });

  it('returns only the requested subset', async () => {
    const [firstKey] = GUEST_STAT_KEYS;

    const data = await queryBus.execute<
      GetGuestStatsQuery,
      Record<string, unknown>
    >(
      new GetGuestStatsQuery(
        '65f1a1a2b3c4d5e6f7a8b9c0',
        '65f1a1a2b3c4d5e6f7a8b9c1',
        [firstKey],
      ),
    );

    expect(Object.keys(data)).toEqual([firstKey]);
  });
});
