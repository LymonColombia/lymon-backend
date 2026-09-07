import { NotFoundException } from '@nestjs/common';
import { GetPaymentSessionStatusHandler } from '@/application/payment/queries/get-payment-session-status/get-payment-session-status.handler';
import { GetPaymentSessionStatusQuery } from '@/application/payment/queries/get-payment-session-status/get-payment-session-status.query';
import { PaymentSession } from '@/domain/payment/entities/payment-session.entity';
import { PAYMENT_SESSION_REPOSITORY } from '@/domain/payment/repositories/payment-session.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';

describe('GetPaymentSessionStatusHandler', () => {
  it('returns the checkout status for the guest session', async () => {
    const session = PaymentSession.create({
      tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000'),
      guestAccountId: GuestAccountId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      cartId: CartId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9d000000000'),
      reference: 'checkout_65f1a1a2b3c4d5e6f7a8b9d0_test',
      amountInCents: 125000,
      currency: 'COP',
      publicKey: 'pub_test_123',
      signatureIntegrity: 'signature-hash',
      redirectUrl: null,
      expirationTime: null,
    });

    const paymentSessionRepository = {
      findByReference: jest.fn().mockResolvedValue(session),
    };

    const handler = new GetPaymentSessionStatusHandler(
      paymentSessionRepository as never,
    );

    const result = await handler.execute(
      new GetPaymentSessionStatusQuery(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        'checkout_65f1a1a2b3c4d5e6f7a8b9d0_test',
      ),
    );

    expect(result.reference).toBe('checkout_65f1a1a2b3c4d5e6f7a8b9d0_test');
    expect(result.status).toBe('PENDING');
    expect(result.isTerminal).toBe(false);
  });

  it('rejects sessions from a different guest account', async () => {
    const session = PaymentSession.create({
      tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000'),
      guestAccountId: GuestAccountId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
      cartId: CartId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9d000000000'),
      reference: 'checkout_65f1a1a2b3c4d5e6f7a8b9d0_test',
      amountInCents: 125000,
      currency: 'COP',
      publicKey: 'pub_test_123',
      signatureIntegrity: 'signature-hash',
      redirectUrl: null,
      expirationTime: null,
    });

    const paymentSessionRepository = {
      findByReference: jest.fn().mockResolvedValue(session),
    };

    const handler = new GetPaymentSessionStatusHandler(
      paymentSessionRepository as never,
    );

    await expect(
      handler.execute(
        new GetPaymentSessionStatusQuery(
          '65f1a1a2-b3c4-d5e6-f7a8-b9ff00000000',
          'checkout_65f1a1a2b3c4d5e6f7a8b9d0_test',
        ),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});