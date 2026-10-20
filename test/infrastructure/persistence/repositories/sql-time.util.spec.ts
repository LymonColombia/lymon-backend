import {
  fromSqlTime,
  toSqlTime,
} from '@/infrastructure/persistence/repositories/sql-time.util';

describe('sql-time util', () => {
  it('round-trips HH:mm', () => {
    for (const time of ['00:00', '09:05', '15:00', '23:59']) {
      expect(fromSqlTime(toSqlTime(time))).toBe(time);
    }
  });

  it('accepts seconds but drops them on the way back', () => {
    expect(fromSqlTime(toSqlTime('15:00:30'))).toBe('15:00');
  });

  it('rejects anything that is not a 24h clock time', () => {
    for (const bad of ['', '3:00 PM', '24:00', '15:60', 'noon', '15']) {
      expect(() => toSqlTime(bad)).toThrow(/Invalid time/);
    }
  });
});
