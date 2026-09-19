/** The integration specs TRUNCATE, so they run against <db>_test, never the dev database. */
export function toTestDatabaseUrl(url: string): string {
  const parsed = new URL(url);
  if (!parsed.pathname.endsWith('_test')) {
    parsed.pathname = `${parsed.pathname}_test`;
  }
  return parsed.toString();
}
