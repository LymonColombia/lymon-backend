import { GetGuestMonthlySpendingHandler } from '@/application/guest/queries/get-guest-monthly-spending/get-guest-monthly-spending.handler';
import { GetGuestMonthlySpendingQuery } from '@/application/guest/queries/get-guest-monthly-spending/get-guest-monthly-spending.query';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';

describe('GetGuestMonthlySpendingHandler', () => {
  let handler: GetGuestMonthlySpendingHandler;
  let reservationRepository: ReturnType<typeof createReservationRepositoryMock>;

  const tenantId = '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000';
  const guestId = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';

  beforeEach(() => {
    reservationRepository = createReservationRepositoryMock();
    reservationRepository.getMonthlySpendingByGuestId.mockResolvedValue([]);
    handler = new GetGuestMonthlySpendingHandler(reservationRepository);
  });

  describe('UT-01: Returns exactly 12 items covering the rolling window', () => {
    it('should return exactly 12 items with totalSpend=0 when repository returns empty array', async () => {
      const query = new GetGuestMonthlySpendingQuery(tenantId, guestId);
      const result = await handler.execute(query);

      expect(result.items).toHaveLength(12);
      expect(result.items.every((item) => item.totalSpend === 0)).toBe(true);
    });

    it('should have each item contain year, month, label, and totalSpend fields', async () => {
      const query = new GetGuestMonthlySpendingQuery(tenantId, guestId);
      const result = await handler.execute(query);

      for (const item of result.items) {
        expect(typeof item.year).toBe('number');
        expect(typeof item.month).toBe('number');
        expect(item.month).toBeGreaterThanOrEqual(1);
        expect(item.month).toBeLessThanOrEqual(12);
        expect(typeof item.label).toBe('string');
        expect(typeof item.totalSpend).toBe('number');
      }
    });

    it('should return items ordered oldest first', async () => {
      const query = new GetGuestMonthlySpendingQuery(tenantId, guestId);
      const result = await handler.execute(query);

      for (let i = 1; i < result.items.length; i++) {
        const prev = result.items[i - 1];
        const curr = result.items[i];
        const prevTime = prev.year * 100 + prev.month;
        const currTime = curr.year * 100 + curr.month;
        expect(currTime).toBeGreaterThan(prevTime);
      }
    });
  });

  describe('UT-02: Merges aggregation data into the correct month slot', () => {
    it('should set totalSpend on the matching month slot when repository returns data', async () => {
      const now = new Date();
      const targetYear = now.getUTCFullYear();
      const targetMonth = now.getUTCMonth() + 1;

      reservationRepository.getMonthlySpendingByGuestId.mockResolvedValue([
        { year: targetYear, month: targetMonth, totalSpend: 1500.75 },
      ]);

      const query = new GetGuestMonthlySpendingQuery(tenantId, guestId);
      const result = await handler.execute(query);

      const matched = result.items.find(
        (item) => item.year === targetYear && item.month === targetMonth,
      );
      expect(matched).toBeDefined();
      expect(matched!.totalSpend).toBe(1500.75);
    });

    it('should leave unmatched month slots at 0 when only one month has data', async () => {
      const now = new Date();
      const targetYear = now.getUTCFullYear();
      const targetMonth = now.getUTCMonth() + 1;

      reservationRepository.getMonthlySpendingByGuestId.mockResolvedValue([
        { year: targetYear, month: targetMonth, totalSpend: 800 },
      ]);

      const query = new GetGuestMonthlySpendingQuery(tenantId, guestId);
      const result = await handler.execute(query);

      const zeroSlots = result.items.filter(
        (item) => !(item.year === targetYear && item.month === targetMonth),
      );
      expect(zeroSlots.every((item) => item.totalSpend === 0)).toBe(true);
    });
  });

  describe('UT-03: Invalid guestId returns 12 zero-items without calling repository', () => {
    it('should return 12 zero items when guestId is not a valid ObjectId', async () => {
      const query = new GetGuestMonthlySpendingQuery(tenantId, 'not-an-object-id');
      const result = await handler.execute(query);

      expect(result.items).toHaveLength(12);
      expect(result.items.every((item) => item.totalSpend === 0)).toBe(true);
      expect(
        reservationRepository.getMonthlySpendingByGuestId,
      ).not.toHaveBeenCalled();
    });

    it('should return 12 zero items when guestId is empty string', async () => {
      const query = new GetGuestMonthlySpendingQuery(tenantId, '');
      const result = await handler.execute(query);

      expect(result.items).toHaveLength(12);
      expect(
        reservationRepository.getMonthlySpendingByGuestId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('UT-04: Label format is correct', () => {
    it('should format label as abbreviated month name and 4-digit year', async () => {
      const query = new GetGuestMonthlySpendingQuery(tenantId, guestId);
      const result = await handler.execute(query);

      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];

      for (const item of result.items) {
        const expectedLabel = `${monthNames[item.month - 1]} ${item.year}`;
        expect(item.label).toBe(expectedLabel);
      }
    });

    it('should use the last item label matching the current month and year', async () => {
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth() + 1;
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const expectedCurrentLabel = `${monthNames[currentMonth - 1]} ${currentYear}`;

      const query = new GetGuestMonthlySpendingQuery(tenantId, guestId);
      const result = await handler.execute(query);

      const lastItem = result.items.at(-1)!
      expect(lastItem.label).toBe(expectedCurrentLabel);
    });
  });
});
