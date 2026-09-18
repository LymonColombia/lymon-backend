import { PrismaGuestTagRepository } from '@/infrastructure/persistence/repositories/prisma-guest-tag.repository';
import {
  GuestTag,
  PLATFORM_TENANT_ID,
} from '@/domain/guest-tag/entities/guest-tag.entity';
import { GuestTagId } from '@/domain/guest-tag/value-objects/guest-tag-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedTenant } from './fixtures';

describe('PrismaGuestTagRepository', () => {
  const repo = new PrismaGuestTagRepository(prisma);

  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // the factories only build platform tags, so a tenant-owned one comes via
  // reconstitute; save() always inserts, so the id passed here is never used
  const tenantTag = (name: string) =>
    GuestTag.reconstitute(
      GuestTagId.createFromString('00000000-0000-4000-8000-000000000000'),
      tenantId,
      name,
      new Date(),
    );

  it('stores a platform tag with a NULL tenant and reads the sentinel back', async () => {
    await repo.save(GuestTag.createPlatform('vip'));

    const row = (await prisma.guest_tags.findFirst())!;
    expect(row.tenant_id).toBeNull();

    const [tag] = await repo.findAll(tenantId);
    expect(tag.getTenantId()).toBe(PLATFORM_TENANT_ID);
    expect(tag.getName()).toBe('vip');
  });

  it('returns the tenant its own tags plus the platform ones, and nobody elses', async () => {
    const otherTenant = await seedTenant({ name: 'Andina' });
    await repo.save(GuestTag.createPlatform('vip'));
    await repo.save(tenantTag('regular'));
    await prisma.guest_tags.create({
      data: { tenant_id: otherTenant.id, name: 'secret' },
    });

    const names = (await repo.findAll(tenantId)).map((tag) => tag.getName());
    expect(names.sort()).toEqual(['regular', 'vip']);
  });

  it('matches names case-insensitively via findByNames', async () => {
    await repo.save(GuestTag.createPlatform('vip'));
    await repo.save(tenantTag('regular'));

    const found = await repo.findByNames(['  VIP ', 'Regular'], tenantId);
    expect(found.map((tag) => tag.getName()).sort()).toEqual(['regular', 'vip']);
  });

  it('checks existence against the right tenant, sentinel included', async () => {
    await repo.save(GuestTag.createPlatform('vip'));
    await repo.save(tenantTag('regular'));

    expect(await repo.existsByTenantIdAndName(PLATFORM_TENANT_ID, 'vip')).toBe(true);
    expect(await repo.existsByTenantIdAndName(tenantId, 'vip')).toBe(false);
    expect(await repo.existsByTenantIdAndName(tenantId, 'regular')).toBe(true);
  });
});
