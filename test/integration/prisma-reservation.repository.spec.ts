import { PrismaReservationRepository } from '@/infrastructure/persistence/repositories/prisma-reservation.repository';
import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import {
  ReservationSource,
  ReservationSourceEnum,
} from '@/domain/reservation/value-objects/reservation-source.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { GuestLifecycleStatus } from '@/domain/guest/value-objects/guest-lifecycle-status.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedGuest, seedProperty, seedTenant, seedUnit } from './fixtures';

describe('PrismaReservationRepository', () => {
  const repo = new PrismaReservationRepository(prisma);

  let ids: { tenantId: string; propertyId: string; unitId: string; guestId: string };

  beforeEach(async () => {
    await resetDatabase();
    const tenantId = (await seedTenant()).id;
    const propertyId = (await seedProperty(tenantId)).id;
    const unitId = (await seedUnit(tenantId, propertyId)).id;
    const guestId = (await seedGuest(tenantId)).id;
    ids = { tenantId, propertyId, unitId, guestId };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const build = (
    overrides: {
      checkIn?: string;
      checkOut?: string;
      price?: number;
      source?: ReservationSourceEnum;
      confirmed?: boolean;
    } = {},
  ) =>
    (overrides.confirmed ? Reservation.createConfirmed : Reservation.create)({
      tenantId: TenantId.createFromString(ids.tenantId),
      propertyId: PropertyId.create(ids.propertyId),
      unitId: UnitId.create(ids.unitId),
      guestId: GuestId.createFromString(ids.guestId),
      dateRange: DateRange.create(
        new Date(overrides.checkIn ?? '2027-03-01'),
        new Date(overrides.checkOut ?? '2027-03-04'),
      ),
      source: ReservationSource.create(overrides.source ?? ReservationSourceEnum.DIRECT),
      guestsCount: 2,
      pricePerNight: overrides.price ?? 250000,
    });

  const withStatus = async (status: ReservationStatusEnum, overrides = {}) => {
    const reservation = build(overrides);
    const id = await repo.save(reservation);
    await prisma.reservations.update({ where: { id }, data: { status } });
    return id;
  };

  it('allocates reservation numbers per tenant, starting at 1', async () => {
    const first = build();
    await repo.save(first);
    expect(first.getReservationNumber()).toBe(1);

    const second = build({ checkIn: '2027-04-01', checkOut: '2027-04-03' });
    await repo.save(second);
    expect(second.getReservationNumber()).toBe(2);

    // a second tenant starts its own sequence
    const otherTenant = (await seedTenant({ name: 'Andina' })).id;
    const otherProperty = (await seedProperty(otherTenant)).id;
    const otherUnit = (await seedUnit(otherTenant, otherProperty)).id;
    const otherGuest = (await seedGuest(otherTenant)).id;
    const theirs = Reservation.create({
      tenantId: TenantId.createFromString(otherTenant),
      propertyId: PropertyId.create(otherProperty),
      unitId: UnitId.create(otherUnit),
      guestId: GuestId.createFromString(otherGuest),
      dateRange: DateRange.create(new Date('2027-03-01'), new Date('2027-03-04')),
      source: ReservationSource.create(ReservationSourceEnum.DIRECT),
      guestsCount: 1,
      pricePerNight: 100,
    });
    await repo.save(theirs);
    expect(theirs.getReservationNumber()).toBe(1);
  });

  it('does not collide when reservations are created concurrently', async () => {
    const reservations = Array.from({ length: 8 }, (_, index) =>
      build({
        checkIn: `2027-05-0${index + 1}`,
        checkOut: `2027-05-0${index + 2}`,
      }),
    );

    await Promise.all(reservations.map((reservation) => repo.save(reservation)));

    const numbers = (
      await prisma.reservations.findMany({ select: { reservation_number: true } })
    ).map((row) => Number(row.reservation_number));

    expect(numbers).toHaveLength(8);
    expect(new Set(numbers).size).toBe(8);
  });

  it('round-trips money, dates and jsonb traveler info', async () => {
    const reservation = build({ price: 250000, confirmed: true });
    reservation.setCheckInInfo([
      {
        fullName: 'Ana Gomez',
        documentType: 'CC',
        documentNumber: '1020304050',
        nationality: 'CO',
        dateOfBirth: null,
        phone: null,
      },
    ]);
    const id = await repo.save(reservation);

    const found = (await repo.findById(ReservationId.create(id)))!;
    expect(found.getPricePerNight()).toBe(250000);
    expect(found.getTotalPrice()).toBe(750000);
    expect(found.getGuestsCount()).toBe(2);
    expect(found.getCheckInInfo()).toEqual([
      {
        fullName: 'Ana Gomez',
        documentType: 'CC',
        documentNumber: '1020304050',
        nationality: 'CO',
        dateOfBirth: null,
        phone: null,
      },
    ]);
    expect(found.getDateRange().getCheckIn().toISOString()).toContain('2027-03-01');
  });

  it('finds overlapping reservations for a unit and only active ones from a date', async () => {
    await withStatus(ReservationStatusEnum.CONFIRMED);
    await withStatus(ReservationStatusEnum.CANCELLED, {
      checkIn: '2027-03-02',
      checkOut: '2027-03-06',
    });

    const overlapping = await repo.findByUnitAndDateRange(
      UnitId.create(ids.unitId),
      DateRange.create(new Date('2027-03-03'), new Date('2027-03-05')),
    );
    expect(overlapping).toHaveLength(2);

    const active = await repo.findActiveByUnitFromDate(
      UnitId.create(ids.unitId),
      new Date('2027-03-01'),
    );
    expect(active).toHaveLength(1);
    expect(active[0].getStatus().toString()).toBe(ReservationStatusEnum.CONFIRMED);
  });

  it('groups a guests bookings by source, most frequent first', async () => {
    await repo.save(build({ source: ReservationSourceEnum.DIRECT }));
    await repo.save(
      build({ source: ReservationSourceEnum.DIRECT, checkIn: '2027-06-01', checkOut: '2027-06-03' }),
    );
    await repo.save(
      build({ source: ReservationSourceEnum.MANUAL, checkIn: '2027-07-01', checkOut: '2027-07-03' }),
    );

    expect(
      await repo.countByGuestIdGroupedBySource(ids.tenantId, ids.guestId),
    ).toEqual([
      { source: 'DIRECT', count: 2 },
      { source: 'MANUAL', count: 1 },
    ]);
  });

  it('sums monthly spending for countable statuses only', async () => {
    await withStatus(ReservationStatusEnum.CONFIRMED, {
      checkIn: '2027-03-01',
      checkOut: '2027-03-03',
      price: 100,
    });
    await withStatus(ReservationStatusEnum.CHECKED_OUT, {
      checkIn: '2027-03-20',
      checkOut: '2027-03-22',
      price: 200,
    });
    await withStatus(ReservationStatusEnum.CANCELLED, {
      checkIn: '2027-04-01',
      checkOut: '2027-04-03',
      price: 900,
    });

    const spending = await repo.getMonthlySpendingByGuestId(
      ids.tenantId,
      ids.guestId,
      new Date('2027-01-01'),
      new Date('2027-12-31'),
    );

    expect(spending).toEqual([{ year: 2027, month: 3, totalSpend: 600 }]);
  });

  it('resolves the lifecycle status by priority', async () => {
    await withStatus(ReservationStatusEnum.CHECKED_OUT);
    await withStatus(ReservationStatusEnum.CONFIRMED, {
      checkIn: '2027-08-01',
      checkOut: '2027-08-03',
    });

    let statuses = await repo.getLifecycleStatusByGuestIds([ids.guestId]);
    expect(statuses.get(ids.guestId)).toBe(GuestLifecycleStatus.UPCOMING_STAY);

    await withStatus(ReservationStatusEnum.CHECKED_IN, {
      checkIn: '2027-09-01',
      checkOut: '2027-09-03',
    });
    statuses = await repo.getLifecycleStatusByGuestIds([ids.guestId]);
    expect(statuses.get(ids.guestId)).toBe(GuestLifecycleStatus.CHECKED_IN);

    expect((await repo.getLifecycleStatusByGuestIds([])).size).toBe(0);
  });

  it('reports active reservations per property and unit', async () => {
    await withStatus(ReservationStatusEnum.CONFIRMED);

    expect(await repo.existsActiveByPropertyId(ids.tenantId, ids.propertyId)).toBe(true);
    expect(await repo.existsActiveByUnitId(ids.tenantId, ids.unitId)).toBe(true);
    expect(await repo.countByTenantId(ids.tenantId)).toBe(1);
  });

  it('filters guest reservations by status and date window', async () => {
    await withStatus(ReservationStatusEnum.CONFIRMED, { checkIn: '2027-03-01', checkOut: '2027-03-03' });
    await withStatus(ReservationStatusEnum.CANCELLED, { checkIn: '2027-06-01', checkOut: '2027-06-03' });

    expect(await repo.countByGuestIds([ids.guestId])).toBe(2);
    expect(
      await repo.countByGuestIds([ids.guestId], {
        statuses: [ReservationStatusEnum.CONFIRMED],
      }),
    ).toBe(1);
    expect(
      await repo.countByGuestIds([ids.guestId], {
        fromDate: new Date('2027-05-01'),
      }),
    ).toBe(1);
    expect(await repo.countByGuestIds([])).toBe(0);
    expect(await repo.findByGuestIds([], { page: 1, limit: 10 })).toEqual([]);
  });
});
