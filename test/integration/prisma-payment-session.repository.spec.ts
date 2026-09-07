import { PrismaPaymentSessionRepository } from '@/infrastructure/persistence/repositories/prisma-payment-session.repository';
import { PrismaCartRepository } from '@/infrastructure/persistence/repositories/prisma-cart.repository';
import { PaymentSession } from '@/domain/payment/entities/payment-session.entity';
import { PaymentSessionStatusEnum } from '@/domain/payment/value-objects/payment-session-status.vo';
import { Cart } from '@/domain/cart/entities/cart.entity';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedTenant } from './fixtures';

describe('PrismaPaymentSessionRepository', () => {
  const repo = new PrismaPaymentSessionRepository(prisma);
  const carts = new PrismaCartRepository(prisma);

  let tenantId: string;
  let accountId: string;
  let cartId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    accountId = (
      await prisma.guest_accounts.create({
        data: { email: 'ana@example.com', password_hash: 'h', full_name: 'Ana' },
      })
    ).id;
    cartId = await carts.save(
      Cart.create({ guestAccountId: GuestAccountId.createFromString(accountId) }),
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newSession = (reference = 'ref-001') =>
    PaymentSession.create({
      tenantId: TenantId.createFromString(tenantId),
      guestAccountId: GuestAccountId.createFromString(accountId),
      cartId: CartId.createFromString(cartId),
      reference,
      amountInCents: 75_000_000,
      currency: 'COP',
      publicKey: 'pub_test_123',
      signatureIntegrity: 'sig_123',
      redirectUrl: 'https://app/return',
    });

  it('round-trips the bigint amount and finds by reference', async () => {
    await repo.save(newSession());

    const row = (await prisma.payment_sessions.findFirst())!;
    expect(row.amount_in_cents).toBe(75_000_000n);
    expect(row.currency).toBe('COP');

    const found = (await repo.findByReference('ref-001'))!;
    expect(found.getAmountInCents()).toBe(75_000_000);
    expect(found.getStatus().toString()).toBe(PaymentSessionStatusEnum.PENDING);
    expect(found.getProviderReference()).toBeNull();
    expect(found.getRedirectUrl()).toBe('https://app/return');
  });

  it('finds the pending session for a cart and stops once it is not pending', async () => {
    const id = await repo.save(newSession());
    const cart = CartId.createFromString(cartId);

    expect(await repo.findPendingByCartId(cart)).not.toBeNull();

    await prisma.payment_sessions.update({
      where: { id },
      data: { status: PaymentSessionStatusEnum.APPROVED },
    });

    expect(await repo.findPendingByCartId(cart)).toBeNull();
  });

  it('finds by provider reference once one is attached', async () => {
    const id = await repo.save(newSession());

    expect(await repo.findByProviderReference('wompi-1')).toBeNull();

    await prisma.payment_sessions.update({
      where: { id },
      data: { provider_reference: 'wompi-1' },
    });

    const found = (await repo.findByProviderReference('wompi-1'))!;
    expect(found.getId()!.toString()).toBe(id);
  });

  it('rejects a duplicate reference', async () => {
    await repo.save(newSession('ref-dup'));
    await expect(repo.save(newSession('ref-dup'))).rejects.toThrow();
  });
});
