import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toTestDatabaseUrl } from './test-database-url';

// Runs via jest `setupFiles`, before any test module is imported: PrismaService reads
// DATABASE_URL in its constructor.
//
// process.loadEnvFile() is useless here — jest swaps process.env for a plain copy, while
// loadEnvFile writes to the real environment the copy never sees. So parse it ourselves.
try {
  const env = readFileSync(resolve(__dirname, '../../.env'), 'utf8');
  for (const line of env.split('\n')) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)$/.exec(line);
    if (!match || line.trimStart().startsWith('#')) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, '$2');
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
