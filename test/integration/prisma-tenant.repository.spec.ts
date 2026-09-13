import { PrismaTenantRepository } from '@/infrastructure/persistence/repositories/prisma-tenant.repository';
import { Tenant } from '@/domain/tenant/entities/tenant.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { PlanType } from '@/domain/tenant/value-objects/plan-type.vo';
import { prisma, resetDatabase } from './prisma.helper';

describe('PrismaTenantRepository', () => {
  const repo = new PrismaTenantRepository(prisma);

  const newTenant = (name = 'Costa Hoteles', email = 'owner@costa.com') =>
    Tenant.create(name, Email.create(email), PlanType.create('TRIAL'));

  beforeEach(resetDatabase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a tenant with a slug derived from name + id', async () => {
    await repo.save(newTenant());

    const row = await prisma.tenants.findFirst();
    expect(row).not.toBeNull();
    expect(row!.slug).toMatch(/^costa-hoteles-[0-9a-f]{4}$/);
  });

  it('widens the slug suffix when the short candidate is taken', async () => {
    await repo.save(newTenant('Costa', 'a@x.com'));
    const tenant = (await prisma.tenants.findFirst())!;
    const suffix4 = tenant.id.slice(-4);

    // squat on exactly the slug a rename to "Andina" would try first
    await prisma.tenants.create({
      data: {
        name: 'Squatter',
        slug: `andina-${suffix4}`,
        owner_email: 'squatter@x.com',
        plan: 'TRIAL',
      },
    });

    const loaded = (await repo.findById(TenantId.createFromString(tenant.id)))!;
    loaded.updateProfile('Andina');
    await repo.save(loaded);

    const renamed = (await prisma.tenants.findUnique({ where: { id: tenant.id } }))!;
    expect(renamed.slug).not.toBe(`andina-${suffix4}`);
    expect(renamed.slug).toBe(`andina-${tenant.id.slice(-6)}`);
  });

  it('regenerates the slug only when the name changes', async () => {
    await repo.save(newTenant());
    const created = (await prisma.tenants.findFirst())!;
    const loaded = (await repo.findById(TenantId.createFromString(created.id)))!;

    await repo.save(loaded);
    expect((await prisma.tenants.findFirst())!.slug).toBe(created.slug);

    loaded.updateProfile('Andina Rentals');
    await repo.save(loaded);
    expect((await prisma.tenants.findFirst())!.slug).toMatch(/^andina-rentals-/);
  });

  it('round-trips through findById, findBySlug and findByOwnerEmail', async () => {
    await repo.save(newTenant());
    const created = (await prisma.tenants.findFirst())!;

    const byId = await repo.findById(TenantId.createFromString(created.id));
    const bySlug = await repo.findBySlug(created.slug);
    const byEmail = await repo.findByOwnerEmail(Email.create('owner@costa.com'));

    for (const found of [byId, bySlug, byEmail]) {
      expect(found).not.toBeNull();
      expect(found!.getName()).toBe('Costa Hoteles');
      expect(found!.getOwnerEmail().toString()).toBe('owner@costa.com');
      expect(found!.getPlan().toString()).toBe('TRIAL');
    }
  });

  it('hides soft-deleted tenants from every read and from exists()', async () => {
    await repo.save(newTenant());
    const created = (await prisma.tenants.findFirst())!;
    const email = Email.create('owner@costa.com');

    expect(await repo.exists(email)).toBe(true);

    await prisma.tenants.update({
      where: { id: created.id },
      data: { deleted_at: new Date() },
    });

    expect(await repo.findById(TenantId.createFromString(created.id))).toBeNull();
    expect(await repo.findBySlug(created.slug)).toBeNull();
    expect(await repo.findByOwnerEmail(email)).toBeNull();
    expect(await repo.exists(email)).toBe(false);
  });
});
