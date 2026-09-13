import { PrismaCartRepository } from '@/infrastructure/persistence/repositories/prisma-cart.repository';
import { Cart } from '@/domain/cart/entities/cart.entity';
import { CartItem } from '@/domain/cart/value-objects/cart-item.vo';
import { CartReservationItem } from '@/domain/cart/value-objects/cart-reservation-item.vo';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { CartStatusEnum } from '@/domain/cart/value-objects/cart-status.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedProperty, seedTenant, seedUnit } from './fixtures';

describe('PrismaCartRepository', () => {
  const repo = new PrismaCartRepository(prisma);

  let accountId: string;
  let tenantId: string;
  let propertyId: string;
  let unitId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    propertyId = (await seedProperty(tenantId)).id;
    unitId = (await seedUnit(tenantId, propertyId)).id;
    accountId = (
      await prisma.guest_accounts.create({
        data: { email: 'ana@example.com', password_hash: 'h', full_name: 'Ana' },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const emptyCart = () =>
    Cart.create({ guestAccountId: GuestAccountId.createFromString(accountId) });

  const anItem = () =>
    CartItem.create({
      tenantId,
      experienceId: ExperienceId.create('11111111-1111-4111-8111-111111111111'),
      experienceName: 'Sunset tour',
      quantity: 1,
      unitPriceCopSnapshot: 120000,
    });

  it('creates one cart per guest account and reuses the row on a second save', async () => {
    const first = await repo.save(emptyCart());
    const second = await repo.save(emptyCart());

    expect(second).toBe(first);
    expect(await prisma.carts.count()).toBe(1);
  });

  it('round-trips experience items through jsonb, dates included', async () => {
    const id = await repo.save(emptyCart());
    const cart = (await repo.findById(CartId.createFromString(id)))!;
    const selectedDate = new Date('2027-05-01T00:00:00.000Z');

    cart.addExperienceItem(
      CartItem.create({
        tenantId,
        experienceId: ExperienceId.create('11111111-1111-4111-8111-111111111111'),
        experienceName: 'Sunset tour',
        selectedDate,
        quantity: 2,
        unitPriceCopSnapshot: 120000,
      }),
    );
    await repo.save(cart);

    const reloaded = (await repo.findById(CartId.createFromString(id)))!;
    const [item] = reloaded.getExperienceItems();
    expect(item.experienceName).toBe('Sunset tour');
    expect(item.quantity).toBe(2);
    expect(item.unitPriceCopSnapshot).toBe(120000);
    expect(item.selectedDate).toEqual(selectedDate);
    expect(item.reservationId).toBeNull();
  });

  it('round-trips the reservation item and clears it back to SQL NULL', async () => {
    const id = await repo.save(emptyCart());
    const cart = (await repo.findById(CartId.createFromString(id)))!;

    cart.setReservationItem(
      CartReservationItem.create({
        tenantId,
        propertyId,
        unitId,
        checkIn: new Date('2027-05-01T00:00:00.000Z'),
        checkOut: new Date('2027-05-04T00:00:00.000Z'),
        guestsCount: 2,
        notes: 'Late arrival',
        pricePerNight: 250000,
        totalPriceCopSnapshot: 750000,
      }),
    );
    await repo.save(cart);

    const withItem = (await repo.findById(CartId.createFromString(id)))!;
    expect(withItem.getReservationItem()!.notes).toBe('Late arrival');
    expect(withItem.getReservationItem()!.checkIn).toEqual(
      new Date('2027-05-01T00:00:00.000Z'),
    );

    withItem.removeReservationItem();
    await repo.save(withItem);

    expect(
      (await prisma.carts.findUnique({ where: { id } }))!.reservation_item,
    ).toBeNull();
    expect(
      (await repo.findById(CartId.createFromString(id)))!.getReservationItem(),
    ).toBeNull();
  });

  it('finds the open cart only while it is open', async () => {
    const id = await repo.save(emptyCart());
    const accountVo = GuestAccountId.createFromString(accountId);

    expect(await repo.findOpenByGuest(accountVo)).not.toBeNull();

    const cart = (await repo.findById(CartId.createFromString(id)))!;
    cart.addExperienceItem(anItem());
    cart.checkout();
    await repo.save(cart);

    expect(await repo.findOpenByGuest(accountVo)).toBeNull();
    expect((await repo.findByGuestAccountId(accountVo))!.getStatus().toString()).toBe(
      CartStatusEnum.PENDING_PAYMENT,
    );
  });

  it('lists stale pending-payment carts', async () => {
    const id = await repo.save(emptyCart());
    const cart = (await repo.findById(CartId.createFromString(id)))!;
    cart.addExperienceItem(anItem());
    cart.checkout();
    await repo.save(cart);

    expect(
      await repo.findPendingPaymentCartsOlderThan(new Date(Date.now() - 60_000)),
    ).toEqual([]);

    await prisma.carts.update({
      where: { id },
      data: { updated_at: new Date('2020-01-01') },
    });

    const stale = await repo.findPendingPaymentCartsOlderThan(
      new Date(Date.now() - 60_000),
    );
    expect(stale).toHaveLength(1);
    expect(stale[0].getId()!.toString()).toBe(id);
  });
});
