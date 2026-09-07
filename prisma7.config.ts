import { defineConfig } from 'prisma/config';

// ponytail: node's built-in .env loader (>=20.12) instead of a dotenv dependency.
// Absent .env is normal in CI, where DATABASE_URL comes from the environment.
try {
  process.loadEnvFile();
} catch {
  /* no .env file */
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
