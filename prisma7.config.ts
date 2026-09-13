import { defineConfig } from 'prisma/config';

// ponytail: node's built-in .env loader (>=20.12) instead of a dotenv dependency.
// Absent .env is normal in CI, where DATABASE_URL comes from the environment.
try {
  process.loadEnvFile();
} catch {
  /* no .env file */
}

export default defineConfig({
  // A directory, not a file: the models live in prisma/schema/*.prisma and a path to
  // a single file makes prisma silently ignore its siblings (prisma#28673).
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
