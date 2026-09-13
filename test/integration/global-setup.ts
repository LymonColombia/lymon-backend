import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { toTestDatabaseUrl } from './test-database-url';

/**
 * Creates the throwaway <db>_test database and replays prisma/migrations into it, so the
 * integration specs run against exactly what `prisma migrate deploy` ships and can
 * TRUNCATE freely without touching development data.
 * ponytail: drops and recreates every run — the specs seed everything they need.
 */
export default async function globalSetup(): Promise<void> {
  const source = readEnvDatabaseUrl();
  const testUrl = toTestDatabaseUrl(source);
  const database = new URL(testUrl).pathname.replace(/^\//, '');

  const admin = new Client({ connectionString: source });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();

  // prisma7.config.ts loads .env, but a variable already in the environment wins.
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'pipe',
  });
}

function readEnvDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(__dirname, '../../.env'), 'utf8');
  const match = /^\s*DATABASE_URL\s*=\s*(.*)$/m.exec(env);
  if (!match) throw new Error('DATABASE_URL is not set');
  return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
}
