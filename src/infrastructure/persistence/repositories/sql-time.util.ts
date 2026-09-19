/**
 * The domain keeps clock times as "HH:mm" strings; the columns are `time`, which the
 * driver hands over as a Date on the epoch day in UTC.
 */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function toSqlTime(value: string): Date {
  if (!TIME_PATTERN.test(value.trim())) {
    throw new Error(`Invalid time "${value}", expected HH:mm`);
  }
  return new Date(`1970-01-01T${value.trim()}Z`);
}

export function fromSqlTime(value: Date): string {
  return value.toISOString().slice(11, 16);
}
