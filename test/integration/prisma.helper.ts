import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';

export const prisma = new PrismaService();

/**
 * Wipes every table. `tenants` cascades to all tenant-scoped tables, so only the
 * globals need naming separately.
 */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE tenants, roles, guest_accounts RESTART IDENTITY CASCADE',
  );
}
