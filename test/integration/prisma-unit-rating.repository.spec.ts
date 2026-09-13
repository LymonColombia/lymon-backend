import { PrismaUnitRatingRepository } from '@/infrastructure/persistence/repositories/prisma-unit-rating.repository';
import { UnitRating } from '@/domain/unit-rating/entities/unit-rating.entity';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import {
  seedGuest,
  seedProperty,
  seedReservation,
  seedTenant,
  seedUnit,
} from './fixtures';

describe('PrismaUnitRatingRepository', () => {
  const repo = new PrismaUnitRatingRepository(prisma);

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

  const rate = async (value: number, message = 'Nice') => {
    const reservation = await seedReservation(ids);
    return repo.save(
      UnitRating.create({
        tenantId: TenantId.createFromString(ids.tenantId),
        unitId: UnitId.create(ids.unitId),
        guestId: GuestId.createFromString(ids.guestId),
        reservationId: ReservationId.create(reservation.id),
        rate: value,
        message,
      }),
    );
  };

  it('returns null rather than NaN when nothing has been rated', async () => {
    expect(await repo.calculateAverageForUnit(UnitId.create(ids.unitId))).toBeNull();
    expect(
      await repo.calculateAverageForGuest(GuestId.createFromString(ids.guestId)),
    ).toBeNull();
  });

  it('averages to one decimal, ignoring soft-deleted rows', async () => {
    await rate(5);
    await rate(4);
    const deleted = await rate(1);

    expect(await repo.calculateAverageForUnit(UnitId.create(ids.unitId))).toBeCloseTo(3.3, 5);

    await prisma.unit_ratings.update({
      where: { id: deleted },
      data: { deleted_at: new Date() },
    });

    expect(await repo.calculateAverageForUnit(UnitId.create(ids.unitId))).toBe(4.5);
    expect(
      await repo.calculateAverageForGuest(GuestId.createFromString(ids.guestId)),
    ).toBe(4.5);
  });

  it('sorts best and worst first and filters by exact rate', async () => {
    await rate(5, 'excellent');
    await rate(1, 'terrible');
    await rate(3, 'ok');

    const unitId = UnitId.create(ids.unitId);
    const best = await repo.findByUnitIdPaginated(unitId, 1, 10, 'best');
    expect(best.ratings.map((r) => r.getRate())).toEqual([5, 3, 1]);

    const worst = await repo.findByUnitIdPaginated(unitId, 1, 10, 'worst');
    expect(worst.ratings.map((r) => r.getRate())).toEqual([1, 3, 5]);

    const filtered = await repo.findByUnitIdPaginated(unitId, 1, 10, undefined, 3);
    expect(filtered.total).toBe(1);
    expect(filtered.ratings[0].getMessage()).toBe('ok');
  });

  it('finds by reservation and hides soft-deleted ratings', async () => {
    const id = await rate(5);
    const created = (await prisma.unit_ratings.findUnique({ where: { id } }))!;

    expect(
      await repo.findByReservationId(ReservationId.create(created.reservation_id)),
    ).not.toBeNull();

    await prisma.unit_ratings.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    expect(
      await repo.findByReservationId(ReservationId.create(created.reservation_id)),
    ).toBeNull();
    expect(
      (await repo.findByGuestIdPaginated(GuestId.createFromString(ids.guestId), 1, 10))
        .total,
    ).toBe(0);
  });
});
