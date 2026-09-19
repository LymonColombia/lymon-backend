import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

describe('DateRange', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  function setNow(iso: string) {
    jest.useFakeTimers({ now: new Date(iso) });
  }

  it('accepts a same-day check-in late at night in Bogota, even when UTC is already tomorrow (LYMON-1092)', () => {
    // 2026-07-01T03:00:00Z == 2026-06-30 10pm in Bogota (UTC-5)
    setNow('2026-07-01T03:00:00Z');
    const range = DateRange.create(
      new Date('2026-06-30'),
      new Date('2026-07-02'),
    );
    expect(range.getCheckIn().toISOString()).toBe('2026-06-30T00:00:00.000Z');
  });

  it('rejects a check-in before today in Bogota', () => {
    setNow('2026-07-01T03:00:00Z'); // still 2026-06-30 in Bogota
    expect(() =>
      DateRange.create(new Date('2026-06-29'), new Date('2026-07-02')),
    ).toThrow(DomainException);
  });

  it('rejects checkOut on or before checkIn', () => {
    setNow('2026-06-01T12:00:00Z');
    expect(() =>
      DateRange.create(new Date('2026-06-10'), new Date('2026-06-10')),
    ).toThrow(DomainException);
  });

  it('counts nights', () => {
    setNow('2026-06-01T12:00:00Z');
    const range = DateRange.create(
      new Date('2026-06-10'),
      new Date('2026-06-14'),
    );
    expect(range.nights()).toBe(4);
  });
});
