import { PrismaGuestRepository } from '@/infrastructure/persistence/repositories/prisma-guest.repository';
import { PrismaGuestTagRepository } from '@/infrastructure/persistence/repositories/prisma-guest-tag.repository';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { GuestStatusEnum } from '@/domain/guest/entities/guest.types';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { GuestTag, PLATFORM_TENANT_ID } from '@/domain/guest-tag/entities/guest-tag.entity';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedProperty, seedTenant, seedUnit } from './fixtures';

describe('PrismaGuestRepository', () => {
  const repo = new PrismaGuestRepository(prisma);
  const tags = new PrismaGuestTagRepository(prisma);

  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newGuest = (
    overrides: Partial<{ fullName: string; email: string; phone: string; doc: string }> = {},
  ) =>
    Guest.create({
      tenantId: TenantId.createFromString(tenantId),
      fullName: overrides.fullName ?? 'Ana Gomez',
      primaryEmail: overrides.email ?? 'ana@example.com',
      phone: overrides.phone ?? '+573001112233',
      identity: {
        documentType: 'CC',
        documentNumber: overrides.doc ?? '1020304050',
        countryCode: 'CO',
      },
    });

  it('flattens identity and summary into columns and reads them back', async () => {
    const id = await repo.save(newGuest());

    const row = (await prisma.guests.findUnique({ where: { id } }))!;
    expect(row.document_number).toBe('1020304050');
    expect(row.total_spend.toNumber()).toBe(0);

    const found = (await repo.findById(GuestId.createFromString(id)))!;
    expect(found.getFullName()).toBe('Ana Gomez');
    expect(found.getIdentity()).toEqual({
      documentType: 'CC',
      documentNumber: '1020304050',
      countryCode: 'CO',
    });
    expect(found.getStatus()).toBe(GuestStatusEnum.ACTIVE);
    expect(found.getTags()).toEqual([]);
    expect(found.getSummary()).toEqual({
      totalBookings: 0,
      totalNights: 0,
      totalSpend: 0,
      lastStayAt: null,
      lastPropertyId: null,
      lastUnitId: null,
    });
  });

  it('persists the CRM summary including the numeric spend and last stay ids', async () => {
    const property = await seedProperty(tenantId);
    const unit = await seedUnit(tenantId, property.id);
    const id = await repo.save(newGuest());
    const guest = (await repo.findById(GuestId.createFromString(id)))!;

    const lastStayAt = new Date('2026-01-15T12:00:00Z');
    guest.updateCrmSummary({
      totalBookings: 3,
      totalNights: 11,
      totalSpend: 1234567.89,
      lastStayAt,
      lastPropertyId: PropertyId.create(property.id),
      lastUnitId: UnitId.create(unit.id),
    });
    await repo.save(guest);

    const reloaded = (await repo.findById(GuestId.createFromString(id)))!;
    expect(reloaded.getSummary()).toEqual({
      totalBookings: 3,
      totalNights: 11,
      totalSpend: 1234567.89,
      lastStayAt,
      lastPropertyId: expect.anything(),
      lastUnitId: expect.anything(),
    });
    expect(reloaded.getSummary().lastPropertyId!.toString()).toBe(property.id);
    expect(reloaded.getSummary().lastUnitId!.toString()).toBe(unit.id);
  });

  it('stores tags as join rows and hydrates them back, platform sentinel included', async () => {
    await tags.save(GuestTag.createPlatform('vip'));
    const [platformTag] = await tags.findAll(tenantId);

    const id = await repo.save(newGuest());
    const guest = (await repo.findById(GuestId.createFromString(id)))!;
    guest.setTags([platformTag]);
    await repo.save(guest);

    expect(await prisma.guest_tag_assignments.count()).toBe(1);

    const reloaded = (await repo.findById(GuestId.createFromString(id)))!;
    expect(reloaded.getTags()).toHaveLength(1);
    expect(reloaded.getTags()[0].getName()).toBe('vip');
    expect(reloaded.getTags()[0].getTenantId()).toBe(PLATFORM_TENANT_ID);

    guest.setTags([]);
    await repo.save(guest);
    expect(await prisma.guest_tag_assignments.count()).toBe(0);
  });

  it('round-trips jsonb preferences', async () => {
    const id = await repo.save(newGuest());
    const guest = (await repo.findById(GuestId.createFromString(id)))!;

    guest.setPreferences([
      {
        catalogItemId: 'item-1',
        labelSnapshot: 'Gluten free',
        category: GuestPreferenceCategoryEnum.DIETARY,
      },
    ]);
    await repo.save(guest);

    expect(
      (await repo.findById(GuestId.createFromString(id)))!.getPreferences(),
    ).toEqual([
      {
        catalogItemId: 'item-1',
        labelSnapshot: 'Gluten free',
        category: GuestPreferenceCategoryEnum.DIETARY,
      },
    ]);
  });

  it('searches across name, email, document and phone, case-insensitively and literally', async () => {
    await repo.save(newGuest({ fullName: 'Ana Gomez', email: 'ana@example.com' }));
    await repo.save(
      newGuest({
        fullName: 'Luis Perez',
        email: 'luis@example.com',
        doc: '9998887770',
        phone: '+573009998877',
      }),
    );

    const tenant = TenantId.createFromString(tenantId);
    expect(await repo.search(tenant, 'ANA')).toHaveLength(1);
    expect(await repo.search(tenant, 'example.com')).toHaveLength(2);
    expect(await repo.search(tenant, '999888')).toHaveLength(1);
    expect(await repo.search(tenant, '+5730099')).toHaveLength(1);
    // a regex metacharacter must not be interpreted
    expect(await repo.search(tenant, 'A.a Gomez')).toHaveLength(0);

    const page = await repo.searchPaginated(tenant, 'example.com', 1, 1);
    expect(page.total).toBe(2);
    expect(page.guests).toHaveLength(1);
  });

  it('matches the primary email case-insensitively and sorts pages by the mapped column', async () => {
    await repo.save(newGuest({ fullName: 'Zoe', email: 'zoe@example.com', doc: '1' }));
    await repo.save(newGuest({ fullName: 'Ana', email: 'ana@example.com', doc: '2' }));

    const tenant = TenantId.createFromString(tenantId);
    expect(await repo.findByPrimaryEmail(tenant, ' Ana@Example.com ')).not.toBeNull();
    expect(await repo.findByDocumentNumber(tenant, ' 1 ')).not.toBeNull();
    expect(await repo.countByTenantId(tenant)).toBe(2);

    const byName = await repo.findByTenantIdPaginated(tenant, 1, 10, 'fullName', 'asc');
    expect(byName.guests.map((guest) => guest.getFullName())).toEqual(['Ana', 'Zoe']);
  });

  it('links to a guest account and finds by it, then hard-deletes', async () => {
    const account = await prisma.guest_accounts.create({
      data: { email: 'ana@example.com', password_hash: 'h', full_name: 'Ana' },
    });
    const id = await repo.save(newGuest());
    const guest = (await repo.findById(GuestId.createFromString(id)))!;

    guest.linkToGuestAccount(GuestAccountId.createFromString(account.id));
    await repo.save(guest);

    const tenant = TenantId.createFromString(tenantId);
    const accountId = GuestAccountId.createFromString(account.id);
    expect(await repo.findByGuestAccountId(tenant, accountId)).not.toBeNull();
    expect(await repo.findAllByGuestAccountId(accountId)).toHaveLength(1);

    await repo.delete(GuestId.createFromString(id));
    expect(await repo.findById(GuestId.createFromString(id))).toBeNull();
  });
});
