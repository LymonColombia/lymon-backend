import { GetGuestBookingOriginsHandler } from '@/application/guest/queries/get-guest-booking-origins/get-guest-booking-origins.handler';
import { GetGuestBookingOriginsQuery } from '@/application/guest/queries/get-guest-booking-origins/get-guest-booking-origins.query';
import { ReservationSourceEnum } from '@/domain/reservation/value-objects/reservation-source.vo';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';

describe('GetGuestBookingOriginsHandler', () => {
  let handler: GetGuestBookingOriginsHandler;
  let reservationRepository: ReturnType<typeof createReservationRepositoryMock>;

  const tenantId = '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000';
  const guestId = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';

  beforeEach(() => {
    reservationRepository = createReservationRepositoryMock();
    handler = new GetGuestBookingOriginsHandler(reservationRepository);
  });

  describe('UT-01: Multiple sources — counts, percentages, sort order', () => {
    it('should return sources sorted by count desc with correct percentages', async () => {
      reservationRepository.countByGuestIdGroupedBySource.mockResolvedValue([
        { source: ReservationSourceEnum.BOOKING, count: 3 },
        { source: ReservationSourceEnum.DIRECT, count: 2 },
        { source: ReservationSourceEnum.AIRBNB, count: 1 },
        { source: ReservationSourceEnum.VRBO, count: 1 },
      ]);

      const result = await handler.execute(new GetGuestBookingOriginsQuery(tenantId, guestId));

      expect(result.total).toBe(7);
      expect(result.sources).toHaveLength(4);
      expect(result.sources[0]).toEqual({ source: ReservationSourceEnum.BOOKING, count: 3, percentage: 43 });
      expect(result.sources[1]).toEqual({ source: ReservationSourceEnum.DIRECT, count: 2, percentage: 29 });
      expect(result.sources[2]).toEqual({ source: ReservationSourceEnum.AIRBNB, count: 1, percentage: 14 });
      expect(result.sources[3]).toEqual({ source: ReservationSourceEnum.VRBO, count: 1, percentage: 14 });
    });
  });

  describe('UT-02: Single source — 100% percentage', () => {
    it('should return 100% when all reservations share the same source', async () => {
      reservationRepository.countByGuestIdGroupedBySource.mockResolvedValue([
        { source: ReservationSourceEnum.AIRBNB, count: 5 },
      ]);

      const result = await handler.execute(new GetGuestBookingOriginsQuery(tenantId, guestId));

      expect(result.total).toBe(5);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]).toEqual({ source: ReservationSourceEnum.AIRBNB, count: 5, percentage: 100 });
    });
  });

  describe('UT-03: No reservations — empty result', () => {
    it('should return total 0 and empty sources array', async () => {
      reservationRepository.countByGuestIdGroupedBySource.mockResolvedValue([]);

      const result = await handler.execute(new GetGuestBookingOriginsQuery(tenantId, guestId));

      expect(result.total).toBe(0);
      expect(result.sources).toEqual([]);
    });
  });

  describe('UT-04: Invalid guestId — early exit', () => {
    it('should return empty result without calling repository', async () => {
      const result = await handler.execute(
        new GetGuestBookingOriginsQuery(tenantId, 'invalid-guest-id'),
      );

      expect(result.total).toBe(0);
      expect(result.sources).toEqual([]);
      expect(reservationRepository.countByGuestIdGroupedBySource).not.toHaveBeenCalled();
    });
  });

  describe('UT-05: Percentage rounding', () => {
    it('should round percentages using Math.round', async () => {
      reservationRepository.countByGuestIdGroupedBySource.mockResolvedValue([
        { source: ReservationSourceEnum.DIRECT, count: 2 },
        { source: ReservationSourceEnum.BOOKING, count: 1 },
      ]);

      const result = await handler.execute(new GetGuestBookingOriginsQuery(tenantId, guestId));

      expect(result.total).toBe(3);
      expect(result.sources[0].percentage).toBe(67);
      expect(result.sources[1].percentage).toBe(33);
    });
  });
});
