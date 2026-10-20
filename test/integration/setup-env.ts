import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { toTestDatabaseUrl } from './test-database-url';

// Runs via jest `setupFiles`, before any test module is imported: PrismaService reads
// DATABASE_URL in its constructor.
//
// process.loadEnvFile() is useless here — jest swaps process.env for a plain copy, while
// loadEnvFile writes to the real environment the copy never sees. So parse, then copy.
try {
  const env = parseEnv(readFileSync(resolve(__dirname, '../../.env'), 'utf8'));
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }
} catch {
  /* no .env file; DATABASE_URL is expected from the environment */
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Start Postgres first:\n  pnpm db:up',
  );
}

// These specs TRUNCATE between tests, so they must never point at the development
// database. globalSetup provisions this one; see test/integration/global-setup.ts.
process.env.DATABASE_URL = toTestDatabaseUrl(process.env.DATABASE_URL);
