import { randomBytes } from 'node:crypto';

/**
 * Entity ids are uuids. Ids arrive from route params and query strings, so the format
 * is checked before a repository turns one into SQL — Postgres rejects a malformed uuid
 * with 22P02, which would surface as a 500 rather than a not-found.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * RFC 9562 uuid v7, the same format as Postgres 18's uuidv7(): a 48-bit millisecond
 * timestamp up front, so ids minted in the app are time-ordered like the ones the
 * database mints and inserts append to the primary-key index.
 * ponytail: no sub-millisecond counter, so ids from the same millisecond sort
 * randomly among themselves; harmless for index locality.
 */
export function uuidv7(): string {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(Date.now(), 0, 6);
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 9562 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
