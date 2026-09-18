import { PrismaMetricsReadRepository } from '@/infrastructure/persistence/repositories/prisma-metrics-read.repository';
import { prisma, resetDatabase } from './prisma.helper';
import {
  seedGuest,
  seedProperty,
  seedReservation,
  seedTenant,
  seedUnit,
} from './fixtures';

describe('PrismaMetricsReadRepository', () => {
  const repo = new PrismaMetricsReadRepository(prisma);

  let ids: { tenantId: string; propertyId: string; unitId: string; guestId: string };
  const window = { from: new Date('2026-01-01'), to: new Date('2026-12-31') };

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

  const book = (status: string, source: string, reason?: string) =>
    seedReservation(ids, { status, source }).then((row) =>
      reason
        ? prisma.reservations.update({
            where: { id: row.id },
            data: { cancellation_reason: reason },
          })
        : row,
    );

  it('returns zeros, not NaN, when the guest has no reservations in the window', async () => {
    const metrics = await repo.getCancellationRates(
      ids.tenantId,
      ids.guestId,
      window.from,
      window.to,
    );

    expect(metrics).toEqual({
      totalReservations: 0,
      cancelledCount: 0,
      noShowCount: 0,
      cancellationRate: 0,
      noShowRate: 0,
      bySource: [],
      topCancellationReasons: [],
    });
  });

  it('computes totals and per-source rates in one pass', async () => {
    await book('CONFIRMED', 'DIRECT');
    await book('CANCELLED', 'DIRECT', 'Changed plans');
    await book('CANCELLED', 'MANUAL', 'Changed plans');
    await book('NO_SHOW', 'MANUAL');

    const metrics = await repo.getCancellationRates(
      ids.tenantId,
      ids.guestId,
      window.from,
      window.to,
    );

    expect(metrics.totalReservations).toBe(4);
    expect(metrics.cancelledCount).toBe(2);
    expect(metrics.noShowCount).toBe(1);
    expect(metrics.cancellationRate).toBe(50);
    expect(metrics.noShowRate).toBe(25);

    const bySource = [...metrics.bySource].sort((a, b) =>
      a.source.localeCompare(b.source),
    );
    expect(bySource).toEqual([
      { source: 'DIRECT', total: 2, cancelled: 1, cancellationRate: 50 },
      { source: 'MANUAL', total: 2, cancelled: 1, cancellationRate: 50 },
    ]);
  });

  it('ranks cancellation reasons and ignores reservations outside the window', async () => {
    await book('CANCELLED', 'DIRECT', 'Changed plans');
    await book('CANCELLED', 'DIRECT', 'Changed plans');
    await book('CANCELLED', 'MANUAL', 'Too expensive');
    await book('CANCELLED', 'MANUAL');

    expect(
      (
        await repo.getCancellationRates(
          ids.tenantId,
          ids.guestId,
          window.from,
          window.to,
        )
      ).topCancellationReasons,
    ).toEqual([
      { reason: 'Changed plans', count: 2 },
      { reason: 'Too expensive', count: 1 },
    ]);

    const outside = await repo.getCancellationRates(
      ids.tenantId,
      ids.guestId,
      new Date('2020-01-01'),
      new Date('2020-12-31'),
    );
    expect(outside.totalReservations).toBe(0);
    expect(outside.topCancellationReasons).toEqual([]);
  });

  it('rounds rates to two decimals', async () => {
    await book('CANCELLED', 'DIRECT');
    await book('CONFIRMED', 'DIRECT');
    await book('CONFIRMED', 'DIRECT');

    const metrics = await repo.getCancellationRates(
      ids.tenantId,
      ids.guestId,
      window.from,
      window.to,
    );
    expect(metrics.cancellationRate).toBe(33.33);
    expect(metrics.bySource[0].cancellationRate).toBe(33.33);
  });
});
