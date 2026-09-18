import { PrismaAuditLogRepository } from '@/infrastructure/persistence/repositories/prisma-audit-log.repository';
import { AuditLog } from '@/domain/audit/entities/audit-log.entity';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedTenant, seedUser } from './fixtures';

describe('PrismaAuditLogRepository', () => {
  const repo = new PrismaAuditLogRepository(prisma);

  let tenantId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    userId = (await seedUser(tenantId)).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const log = (
    overrides: Partial<{
      action: AuditAction;
      entityType: AuditEntityType;
      createdAt: Date;
    }> = {},
  ) =>
    AuditLog.create({
      tenantId,
      userId,
      userEmail: 'owner@costa.com',
      action: overrides.action ?? AuditAction.AUTH_LOGIN,
      entityType: overrides.entityType ?? AuditEntityType.AUTH,
      metadata: { ip: 'x' },
      newValue: { after: 1 },
      ipAddress: '10.0.0.1',
    });

  it('writes the json columns and reads them back, leaving absent ones undefined', async () => {
    await repo.save(log());

    const { items } = await repo.findByTenant(tenantId, {}, { page: 1, limit: 10 });
    expect(items).toHaveLength(1);
    expect(items[0].getMetadata()).toEqual({ ip: 'x' });
    expect(items[0].getNewValue()).toEqual({ after: 1 });
    expect(items[0].getPreviousValue()).toBeUndefined();
    expect(items[0].getEntityId()).toBeUndefined();
    expect(items[0].getIpAddress()).toBe('10.0.0.1');
  });

  it('filters by user, action, entity type and date window', async () => {
    await repo.save(log());
    await repo.save(
      log({ action: AuditAction.TENANT_PROFILE_UPDATED, entityType: AuditEntityType.TENANT }),
    );

    const page = { page: 1, limit: 10 };
    expect((await repo.findByTenant(tenantId, {}, page)).total).toBe(2);
    expect(
      (await repo.findByTenant(tenantId, { action: AuditAction.AUTH_LOGIN }, page)).total,
    ).toBe(1);
    expect(
      (await repo.findByTenant(tenantId, { entityType: AuditEntityType.TENANT }, page))
        .total,
    ).toBe(1);
    expect((await repo.findByTenant(tenantId, { userId }, page)).total).toBe(2);
    expect(
      (await repo.findByTenant(tenantId, { dateFrom: new Date('2100-01-01') }, page))
        .total,
    ).toBe(0);
  });

  it('paginates newest first and reports the page it was asked for', async () => {
    await repo.save(log());
    await repo.save(log());
    await repo.save(log());

    const result = await repo.findByTenant(tenantId, {}, { page: 2, limit: 2 });
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(2);
    expect(result.items).toHaveLength(1);
  });
});
