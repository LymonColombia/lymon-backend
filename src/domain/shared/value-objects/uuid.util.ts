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
