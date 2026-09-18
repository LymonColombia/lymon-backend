import { NotFoundException } from '@nestjs/common';
import { createTransactionManagerMock } from '@test/shared/mocks/services/transaction-manager.mock';
import { createCartRepositoryMock } from '@test/shared/mocks/repositories/cart-repository.mock';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { createExperiencePurchaseRepositoryMock } from '@test/shared/mocks/repositories/experience-purchase-repository.mock';
import { makeCart, makeCartItem } from '@test/shared/fixtures/cart.fixture';
import { makeReservation } from '@test/shared/fixtures/reservation.fixture';
import { PaymentSession } from '@/domain/payment/entities/payment-session.entity';
import { ProcessWompiWebhookCommand } from '@/application/payment/commands/process-wompi-webhook/process-wompi-webhook.command';
import { ProcessWompiWebhookHandler } from '@/application/payment/commands/process-wompi-webhook/process-wompi-webhook.handler';
import { PAYMENT_SESSION_REPOSITORY } from '@/domain/payment/repositories/payment-session.repository';
import { CART_REPOSITORY } from '@/domain/cart/repositories/cart.repository';
import { RESERVATION_REPOSITORY } from '@/domain/reservation/repositories/reservation.repository';
import { EXPERIENCE_PURCHASE_REPOSITORY } from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { CartReservationItem } from '@/domain/cart/value-objects/cart-reservation-item.vo';
import { ExperiencePurchaseStatusEnum } from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';

const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000';
const GUEST_ACCOUNT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const CART_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9d000000000';
const RESERVATION_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000';
const PAYMENT_REFERENCE = 'checkout_65f1a1a2b3c4d5e6f7a8b9d0_test';
const PROVIDER_REFERENCE = '1234-1610641025-49201';

function makeApprovedPayload() {
  return {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: PROVIDER_REFERENCE,
        amount_in_cents: 500000,
        reference: PAYMENT_REFERENCE,
        currency: 'COP' as const,
        status: 'APPROVED' as const,
      },
    },
    environment: 'test' as const,
    signature: {
      properties: [
        'transaction.id',
        'transaction.status',
        'transaction.amount_in_cents',
      ],
      checksum: 'placeholder',
    },
    timestamp: 1530291411,
    sent_at: '2018-07-20T16:45:05.000Z',
  };
}

describe('ProcessWompiWebhookHandler', () => {
  let handler: ProcessWompiWebhookHandler;
  let transactionManager = createTransactionManagerMock();
  let paymentSessionRepository: {
    save: jest.Mock;
    findByReference: jest.Mock;
    findByProviderReference: jest.Mock;
    findPendingByCartId: jest.Mock;
  };
  let cartRepository = createCartRepositoryMock();
  let reservationRepository = createReservationRepositoryMock();
  let experiencePurchaseRepository = createExperiencePurchaseRepositoryMock();
  let eventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    transactionManager = createTransactionManagerMock();
    paymentSessionRepository = {
      save: jest.fn().mockResolvedValue('session-id'),
      findByReference: jest.fn(),
      findByProviderReference: jest.fn(),
      findPendingByCartId: jest.fn(),
    };
    cartRepository = createCartRepositoryMock();
    reservationRepository = createReservationRepositoryMock();
    experiencePurchaseRepository = createExperiencePurchaseRepositoryMock();
    eventEmitter = { emit: jest.fn() };

    handler = new ProcessWompiWebhookHandler(
      transactionManager,
      paymentSessionRepository as never,
      cartRepository,
      reservationRepository,
      experiencePurchaseRepository,
      eventEmitter as never,
    );
  });

  it('confirms reservation and experience purchases for approved payments', async () => {
    const cartItem = makeCartItem({ quantity: 2 });
    const reservationItem = CartReservationItem.create({
      tenantId: TENANT_ID,
      propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
      unitId: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
      checkIn: new Date('2030-06-01'),
      checkOut: new Date('2030-06-05'),
      guestsCount: 2,
      notes: null,
      pricePerNight: 100000,
      totalPriceCopSnapshot: 400000,
      reservationId: RESERVATION_ID,
    });
    const cart = makeCart({
      id: CART_ID,
      guestAccountId: GUEST_ACCOUNT_ID,
      experienceItems: [cartItem],
      reservationItem,
    });
    const session = PaymentSession.create({
      tenantId: TenantId.createFromString(TENANT_ID),
      guestAccountId: GuestAccountId.createFromString(GUEST_ACCOUNT_ID),
      cartId: CartId.createFromString(CART_ID),
      reference: PAYMENT_REFERENCE,
      amountInCents: 500000,
      currency: 'COP',
      publicKey: 'pub_test_123',
      signatureIntegrity: 'signature-hash',
      redirectUrl: null,
      expirationTime: null,
    });

    paymentSessionRepository.findByReference.mockResolvedValue(session);
    cartRepository.findById.mockResolvedValue(cart);
    reservationRepository.findById.mockResolvedValue(
      makeReservation({
        id: RESERVATION_ID,
        status: ReservationStatusEnum.PENDING,
      }),
    );
    experiencePurchaseRepository.save.mockResolvedValue('purchase-id');

    await handler.execute(
      new ProcessWompiWebhookCommand(makeApprovedPayload() as never),
    );

    expect(transactionManager.executeInTransaction).toHaveBeenCalledTimes(1);
    expect(paymentSessionRepository.save).toHaveBeenCalled();
    expect(reservationRepository.save).toHaveBeenCalledTimes(1);
    expect(experiencePurchaseRepository.save).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'wompi.payment.approved',
      expect.objectContaining({ reference: PAYMENT_REFERENCE }),
    );
  });

  it('marks declined payments without touching business state', async () => {
    const session = PaymentSession.create({
      tenantId: TenantId.createFromString(TENANT_ID),
      guestAccountId: GuestAccountId.createFromString(GUEST_ACCOUNT_ID),
      cartId: CartId.createFromString(CART_ID),
      reference: PAYMENT_REFERENCE,
      amountInCents: 500000,
      currency: 'COP',
      publicKey: 'pub_test_123',
      signatureIntegrity: 'signature-hash',
      redirectUrl: null,
      expirationTime: null,
    });

    paymentSessionRepository.findByReference.mockResolvedValue(session);

    await handler.execute(
      new ProcessWompiWebhookCommand({
        ...makeApprovedPayload(),
        data: {
          transaction: {
            ...makeApprovedPayload().data.transaction,
            status: 'DECLINED',
          },
        },
      } as never),
    );

    expect(transactionManager.executeInTransaction).not.toHaveBeenCalled();
    expect(paymentSessionRepository.save).toHaveBeenCalledTimes(1);
    expect(cartRepository.findById).toHaveBeenCalledTimes(1);
    expect(reservationRepository.save).not.toHaveBeenCalled();
    expect(experiencePurchaseRepository.save).not.toHaveBeenCalled();
  });

  it('ignores already processed sessions', async () => {
    const session = PaymentSession.reconstitute({
      id: 'session-id',
      tenantId: TenantId.createFromString(TENANT_ID),
      guestAccountId: GuestAccountId.createFromString(GUEST_ACCOUNT_ID),
      cartId: CartId.createFromString(CART_ID),
      reference: PAYMENT_REFERENCE,
      amountInCents: 500000,
      currency: 'COP',
      publicKey: 'pub_test_123',
      signatureIntegrity: 'signature-hash',
      redirectUrl: null,
      expirationTime: null,
      providerReference: PROVIDER_REFERENCE,
      status: {
        getValue: () => 'APPROVED',
        isPending: () => false,
        isTerminal: () => true,
        canTransitionTo: () => false,
        toString: () => 'APPROVED',
      } as never,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    paymentSessionRepository.findByReference.mockResolvedValue(session);

    await handler.execute(
      new ProcessWompiWebhookCommand(makeApprovedPayload() as never),
    );

    expect(transactionManager.executeInTransaction).not.toHaveBeenCalled();
    expect(paymentSessionRepository.save).not.toHaveBeenCalled();
    expect(cartRepository.findById).not.toHaveBeenCalled();
  });
});
