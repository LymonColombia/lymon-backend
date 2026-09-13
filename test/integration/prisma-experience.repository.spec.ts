import { PrismaExperienceRepository } from '@/infrastructure/persistence/repositories/prisma-experience.repository';
import { PrismaExperiencePurchaseRepository } from '@/infrastructure/persistence/repositories/prisma-experience-purchase.repository';
import { Experience } from '@/domain/experience/entities/experience.entity';
import { ExperiencePurchase } from '@/domain/experience-purchase/entities/experience-purchase.entity';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperiencePurchaseId } from '@/domain/experience-purchase/value-objects/experience-purchase-id.vo';
import { ExperiencePurchaseStatusEnum } from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';
import { ExperienceCategory } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceAvailabilityType } from '@/domain/experience/value-objects/experience-availability-type.vo';
import {
  ExperienceScope,
  ExperienceScopeEnum,
} from '@/domain/experience/value-objects/experience-scope.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedProperty, seedTenant } from './fixtures';

describe('Prisma experience repositories', () => {
  const experiences = new PrismaExperienceRepository(prisma);
  const purchases = new PrismaExperiencePurchaseRepository(prisma);

  let tenantId: string;
  let propertyId: string;
  let accountId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    propertyId = (await seedProperty(tenantId)).id;
    accountId = (
      await prisma.guest_accounts.create({
        data: { email: 'ana@example.com', password_hash: 'h', full_name: 'Ana Gomez' },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newExperience = (
    overrides: {
      name?: string;
      price?: number;
      city?: string;
      global?: boolean;
      capacity?: number;
    } = {},
  ) =>
    Experience.create({
      tenantId: TenantId.createFromString(tenantId),
      scope: ExperienceScope.create(
        overrides.global ? ExperienceScopeEnum.GLOBAL : ExperienceScopeEnum.PROPERTY,
      ),
      propertyId: overrides.global ? undefined : PropertyId.create(propertyId),
      name: overrides.name ?? 'Sunset tour',
      description: 'A boat ride at sunset',
      city: overrides.city ?? 'Cartagena',
      category: ExperienceCategory.create('TRANSPORTATION'),
      priceCop: overrides.price ?? 120000,
      capacity: overrides.capacity ?? 10,
      availabilityType: ExperienceAvailabilityType.create('RECURRING'),
      recurrence: { daysOfWeek: [1, 3, 5], startTime: '16:00', endTime: '19:00' },
      allowStandalonePurchase: true,
      allowReservationPurchase: true,
      mediaKeys: ['experiences/a.jpg'],
    });

  it('round-trips the bigint price and the jsonb recurrence', async () => {
    const id = await experiences.save(newExperience({ price: 9_500_000 }));

    const found = (await experiences.findById(ExperienceId.create(id)))!;
    expect(found.getPriceCop()).toBe(9_500_000);
    expect(found.getRecurrence()).toEqual({
      daysOfWeek: [1, 3, 5],
      startTime: '16:00',
      endTime: '19:00',
    });
    expect(found.getMediaKeys()).toEqual(['experiences/a.jpg']);
    expect(found.getMinimumParticipants()).toBe(1);
  });

  it('checks name uniqueness per property, case-insensitively and whole-string', async () => {
    await experiences.save(newExperience({ name: 'Sunset tour' }));
    const property = PropertyId.create(propertyId);

    expect(await experiences.existsByPropertyIdAndName(property, ' sunset TOUR ')).toBe(true);
    expect(await experiences.existsByPropertyIdAndName(property, 'Sunset')).toBe(false);
  });

  it('separates global from property-scoped experiences and matches the city exactly', async () => {
    await experiences.save(newExperience({ name: 'Property one' }));
    await experiences.save(newExperience({ name: 'Global one', global: true, city: 'Bogota' }));

    expect(
      (await experiences.findAvailableForGuestPaginated({}, 1, 10)).total,
    ).toBe(2);
    expect(
      (
        await experiences.findAvailableForGuestPaginated(
          { scope: ExperienceScopeEnum.GLOBAL },
          1,
          10,
        )
      ).experiences.map((experience) => experience.getName()),
    ).toEqual(['Global one']);
    expect(
      (
        await experiences.findAvailableForGuestPaginated(
          { scope: ExperienceScopeEnum.PROPERTY },
          1,
          10,
        )
      ).total,
    ).toBe(1);
    expect(
      (await experiences.findAvailableForGuestPaginated({ city: 'bogota' }, 1, 10)).total,
    ).toBe(1);
    expect(
      (await experiences.findAvailableForGuestPaginated({ city: 'Bogo' }, 1, 10)).total,
    ).toBe(0);
  });

  it('sorts by price and filters by capacity, and hides soft-deleted rows', async () => {
    const cheap = await experiences.save(
      newExperience({ name: 'Cheap', price: 1000, capacity: 2 }),
    );
    await experiences.save(newExperience({ name: 'Pricey', price: 900000, capacity: 30 }));

    const tenant = TenantId.createFromString(tenantId);
    expect(
      (
        await experiences.findAvailableForGuestPaginated({ sortByPrice: 'asc' }, 1, 10)
      ).experiences.map((experience) => experience.getName()),
    ).toEqual(['Cheap', 'Pricey']);
    expect(
      (await experiences.findByTenantIdPaginated(tenant, 1, 10, undefined, 20)).total,
    ).toBe(1);

    await experiences.delete(ExperienceId.create(cheap));
    expect(await experiences.findById(ExperienceId.create(cheap))).toBeNull();
    expect((await experiences.findByTenantIdPaginated(tenant, 1, 10)).total).toBe(1);
  });

  it('joins experience and guest names into the tenant read model', async () => {
    const experienceId = await experiences.save(newExperience());
    const purchaseId = await purchases.save(
      ExperiencePurchase.create({
        tenantId: TenantId.createFromString(tenantId),
        guestAccountId: GuestAccountId.createFromString(accountId),
        experienceId: ExperienceId.create(experienceId),
        selectedDate: new Date('2027-05-01'),
        quantity: 3,
        unitPriceCop: 120000,
      }),
    );

    const tenant = TenantId.createFromString(tenantId);
    const [row] = await purchases.findByTenantIdPaginated(tenant, 1, 10);
    expect(row.id).toBe(purchaseId);
    expect(row.experienceName).toBe('Sunset tour');
    expect(row.guestName).toBe('Ana Gomez');
    expect(row.quantity).toBe(3);
    expect(row.totalPriceCop).toBe(360000);

    const found = (await purchases.findById(
      ExperiencePurchaseId.createFromString(purchaseId),
    ))!;
    expect(found.getUnitPriceCop()).toBe(120000);
    expect(found.getTotalPriceCop()).toBe(360000);
    expect(found.getStatus().toString()).toBe(ExperiencePurchaseStatusEnum.PENDING);
  });

  it('counts confirmed purchases per date and lists the reserved dates', async () => {
    const experienceId = await experiences.save(newExperience());
    const tenant = TenantId.createFromString(tenantId);

    const buy = async (date: string | null, status: string) => {
      const id = await purchases.save(
        ExperiencePurchase.create({
          tenantId: tenant,
          guestAccountId: GuestAccountId.createFromString(accountId),
          experienceId: ExperienceId.create(experienceId),
          selectedDate: date ? new Date(date) : null,
          quantity: 1,
          unitPriceCop: 120000,
        }),
      );
      await prisma.experience_purchases.update({ where: { id }, data: { status } });
    };

    await buy('2027-05-01', 'CONFIRMED');
    await buy('2027-05-01', 'CONFIRMED');
    await buy('2027-05-02', 'CONFIRMED');
    await buy('2027-05-03', 'PENDING');
    await buy(null, 'CONFIRMED');

    expect(
      await purchases.countConfirmedByExperienceAndDate(
        experienceId,
        new Date('2027-05-01'),
      ),
    ).toBe(2);
    expect(
      await purchases.countConfirmedByExperienceAndDate(experienceId, null),
    ).toBe(1);

    const reserved = await purchases.findReservedDatesByExperienceId(
      ExperienceId.create(experienceId),
    );
    expect(reserved.map((date) => date.toISOString().slice(0, 10)).sort()).toEqual([
      '2027-05-01',
      '2027-05-02',
    ]);

    const windowed = await purchases.findReservedDatesByExperienceId(
      ExperienceId.create(experienceId),
      new Date('2027-05-02'),
    );
    expect(windowed).toHaveLength(1);
  });

  it('counts and pages a guests purchases', async () => {
    const experienceId = await experiences.save(newExperience());
    const tenant = TenantId.createFromString(tenantId);
    const account = GuestAccountId.createFromString(accountId);

    for (let i = 0; i < 3; i++) {
      await purchases.save(
        ExperiencePurchase.create({
          tenantId: tenant,
          guestAccountId: account,
          experienceId: ExperienceId.create(experienceId),
          quantity: 1,
          unitPriceCop: 120000,
        }),
      );
    }

    expect(await purchases.countByGuestAccountId(account, tenant)).toBe(3);
    expect(await purchases.findByGuestAccountId(account, tenant, 1, 2)).toHaveLength(2);
    expect(await purchases.findByGuestAccountId(account, tenant, 2, 2)).toHaveLength(1);
    expect(
      await purchases.countByTenantId(tenant, {
        status: ExperiencePurchaseStatusEnum.PENDING,
      }),
    ).toBe(3);
  });
});
