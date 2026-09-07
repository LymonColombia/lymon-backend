import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { toTestDatabaseUrl } from './test-database-url';

/**
 * Creates the throwaway <db>_test database and applies the schema to it, so the
 * integration specs can TRUNCATE freely without touching development data.
 * ponytail: drops and recreates every run — the specs seed everything they need.
 */
export default async function globalSetup(): Promise<void> {
  const source = readEnvDatabaseUrl();
  const testUrl = new URL(toTestDatabaseUrl(source));
  const database = testUrl.pathname.replace(/^\//, '');

  const admin = new Client({ connectionString: source });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();

  const schema = readFileSync(
    resolve(__dirname, '../../src/infrastructure/migrations/sql/postgres-schema.sql'),
    'utf8',
  );
  const target = new Client({ connectionString: testUrl.toString() });
  await target.connect();
  await target.query(schema);
  await target.end();
}

function readEnvDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(__dirname, '../../.env'), 'utf8');
  const match = /^\s*DATABASE_URL\s*=\s*(.*)$/m.exec(env);
  if (!match) throw new Error('DATABASE_URL is not set');
  return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
}
