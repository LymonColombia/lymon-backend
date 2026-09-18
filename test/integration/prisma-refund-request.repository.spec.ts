import { PrismaRefundRequestRepository } from '@/infrastructure/persistence/repositories/prisma-refund-request.repository';
import { RefundRequest } from '@/domain/refund/entities/refund-request.entity';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import {
  seedGuest,
  seedProperty,
  seedReservation,
  seedTenant,
  seedUnit,
  seedUser,
} from './fixtures';

describe('PrismaRefundRequestRepository', () => {
  const repo = new PrismaRefundRequestRepository(prisma);

  let ids: { tenantId: string; propertyId: string; unitId: string; guestId: string };
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    const tenantId = (await seedTenant()).id;
    const propertyId = (await seedProperty(tenantId)).id;
    const unitId = (await seedUnit(tenantId, propertyId)).id;
    const guestId = (await seedGuest(tenantId)).id;
    ids = { tenantId, propertyId, unitId, guestId };
    userId = (await seedUser(tenantId)).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const request = async (amount = 750000) => {
    const reservation = await seedReservation(ids);
    const id = await repo.save(
      RefundRequest.create({
        tenantId: TenantId.createFromString(ids.tenantId),
        reservationId: ReservationId.create(reservation.id),
        guestId: GuestId.createFromString(ids.guestId),
        amount,
        reason: 'Changed plans',
      }),
    );
    return { id, reservationId: reservation.id };
  };

  it('stores the actor kind and the decimal amount', async () => {
    const { id } = await request(750000.5);

    const row = (await prisma.refund_requests.findUnique({ where: { id } }))!;
    expect(row.requested_by).toBe('guest');
    expect(row.amount.toNumber()).toBe(750000.5);

    const found = (await repo.findById(id))!;
    expect(found.getAmount()).toBe(750000.5);
    expect(found.getStatus().toString()).toBe('PENDING');
    expect(found.getReviewedBy()).toBeNull();
    expect(found.getReason()).toBe('Changed plans');
  });

  it('persists a review decision in place', async () => {
    const { id } = await request();
    const found = (await repo.findById(id))!;

    found.approve(userId);
    expect(await repo.save(found)).toBe(id);

    expect(await prisma.refund_requests.count()).toBe(1);
    const reloaded = (await repo.findById(id))!;
    expect(reloaded.getStatus().toString()).toBe('APPROVED');
    expect(reloaded.getReviewedBy()).toBe(userId);
    expect(reloaded.getReviewedAt()).not.toBeNull();
  });

  it('filters by status, paginates newest first and finds by reservation', async () => {
    const first = await request();
    await request();

    const tenant = TenantId.createFromString(ids.tenantId);
    expect((await repo.findByTenant(tenant, 1, 10)).total).toBe(2);
    expect((await repo.findByTenant(tenant, 1, 1)).items).toHaveLength(1);
    expect((await repo.findByTenant(tenant, 1, 10, 'APPROVED')).total).toBe(0);
    expect((await repo.findByTenant(tenant, 1, 10, 'PENDING')).total).toBe(2);

    expect(await repo.findByReservationId(first.reservationId)).not.toBeNull();
    expect(
      await repo.findByReservationId('00000000-0000-4000-8000-000000000000'),
    ).toBeNull();
  });
});
