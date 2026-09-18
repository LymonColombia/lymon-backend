import { NotFoundException } from '@nestjs/common';
import { CheckoutCartHandler } from '@/application/cart/commands/checkout-cart/checkout-cart.handler';
import { CheckoutCartCommand } from '@/application/cart/commands/checkout-cart/checkout-cart.command';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { createCartRepositoryMock } from '@test/shared/mocks/repositories/cart-repository.mock';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { createGuestAccountRepositoryMock } from '@test/shared/mocks/repositories/guest-account-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { createExperienceRepositoryMock } from '@test/shared/mocks/repositories/experience-repository.mock';
import { createExperiencePurchaseRepositoryMock } from '@test/shared/mocks/repositories/experience-purchase-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { makeCart, makeCartItem } from '@test/shared/fixtures/cart.fixture';
import { makeReservation } from '@test/shared/fixtures/reservation.fixture';
import { makeGuest } from '@test/shared/fixtures/guest.fixture';
import { makeExperience } from '@test/shared/fixtures/experience.fixture';
import { makeUnit } from '@test/shared/fixtures/unit.fixture';
import { CartReservationItem } from '@/domain/cart/value-objects/cart-reservation-item.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { CartStatusEnum } from '@/domain/cart/value-objects/cart-status.vo';
import {
  type IPaymentGateway,
  type PaymentCheckoutResponse,
} from '@/domain/shared/payment-gateway.interface';

const GUEST_ACCOUNT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000';
const PROPERTY_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000';
const UNIT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000';
const RESERVATION_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000';
const GUEST_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000';

const baseCommand = new CheckoutCartCommand(
  GUEST_ACCOUNT_ID,
  TENANT_ID,
  'guest@example.com',
);

const paymentResponse: PaymentCheckoutResponse = {
  publicKey: 'pub_test_123',
  reference: 'checkout_65f1a1a2b3c4d5e6f7a8bb01_test',
  amountInCents: 90000,
  currency: 'COP',
  signatureIntegrity: 'signature-hash',
  redirectUrl: 'https://example.com/checkout',
  expirationTime: null,
  customerData: {
    email: 'guest@example.com',
  },
};

function makeDraftReservationItem(
  overrides?: Partial<{
    reservationId: string | null;
    totalPriceCopSnapshot: number;
  }>,
): CartReservationItem {
  return CartReservationItem.create({
    tenantId: TENANT_ID,
    propertyId: PROPERTY_ID,
    unitId: UNIT_ID,
    checkIn: new Date('2030-06-01'),
    checkOut: new Date('2030-06-05'),
    guestsCount: 2,
    notes: null,
    pricePerNight: 100000,
    totalPriceCopSnapshot: overrides?.totalPriceCopSnapshot ?? 400000,
    reservationId: overrides?.reservationId ?? null,
  });
}

describe('CheckoutCartHandler', () => {
  let handler: CheckoutCartHandler;
  let cartRepository: ReturnType<typeof createCartRepositoryMock>;
  let reservationRepository: ReturnType<typeof createReservationRepositoryMock>;
  let guestRepository: ReturnType<typeof createGuestRepositoryMock>;
  let guestAccountRepository: ReturnType<
    typeof createGuestAccountRepositoryMock
  >;
  let unitRepository: ReturnType<typeof createUnitRepositoryMock>;
  let experienceRepository: ReturnType<typeof createExperienceRepositoryMock>;
  let purchaseRepository: ReturnType<
    typeof createExperiencePurchaseRepositoryMock
  >;
  let paymentSessionRepository: {
    save: jest.Mock;
    findByReference: jest.Mock;
    findByProviderReference: jest.Mock;
    findPendingByCartId: jest.Mock;
  };
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;
  let paymentGateway: jest.Mocked<IPaymentGateway>;

  beforeEach(() => {
    cartRepository = createCartRepositoryMock();
    reservationRepository = createReservationRepositoryMock();
    guestRepository = createGuestRepositoryMock();
    guestAccountRepository = createGuestAccountRepositoryMock();
    unitRepository = createUnitRepositoryMock();
    experienceRepository = createExperienceRepositoryMock();
    purchaseRepository = createExperiencePurchaseRepositoryMock();
    paymentSessionRepository = {
      save: jest.fn(),
      findByReference: jest.fn(),
      findByProviderReference: jest.fn(),
      findPendingByCartId: jest.fn().mockResolvedValue(null),
    };
    eventEmitter = createEventEmitterMock();
    paymentGateway = {
      buildCheckoutPayload: jest.fn().mockResolvedValue(paymentResponse),
    } as unknown as jest.Mocked<IPaymentGateway>;

    handler = new CheckoutCartHandler(
      cartRepository,
      reservationRepository,
      guestRepository,
      guestAccountRepository,
      unitRepository,
      experienceRepository,
      purchaseRepository,
      paymentSessionRepository as never,
      paymentGateway,
      eventEmitter as never,
    );
  });

  it('throws NotFoundException when no open cart exists', async () => {
    cartRepository.findOpenByGuest.mockResolvedValue(null);
    cartRepository.findOpenByGuest.mockResolvedValue(null);

    await expect(handler.execute(baseCommand)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws DomainException when cart is empty', async () => {
    cartRepository.findOpenByGuest.mockResolvedValue(makeCart());
    const guest = makeGuest({ id: GUEST_ID });
    guestRepository.findByGuestAccountId.mockResolvedValue(guest);
    cartRepository.findOpenByGuest.mockResolvedValue(makeCart());

    await expect(handler.execute(baseCommand)).rejects.toThrow(DomainException);
  });

  it('creates Wompi payload for cart with only experience items', async () => {
    const cartItem = makeCartItem({ quantity: 2 });
    const cart = makeCart({ experienceItems: [cartItem] });
    cartRepository.findOpenByGuest.mockResolvedValue(cart);

    const guest = makeGuest({ id: GUEST_ID });
    guestRepository.findByGuestAccountId.mockResolvedValue(guest);
    cartRepository.findOpenByGuest.mockResolvedValue(cart);

    experienceRepository.findById.mockResolvedValue(makeExperience());
    purchaseRepository.countConfirmedByExperienceAndDate.mockResolvedValue(0);
    cartRepository.save.mockResolvedValue(cart.getId()!.toString());

    const result = await handler.execute(baseCommand);

    expect(paymentGateway.buildCheckoutPayload).toHaveBeenCalledTimes(1);
    expect(
      cartRepository.save.mock.calls[
        cartRepository.save.mock.calls.length - 1
      ][0]
        .getStatus()
        .getValue(),
    ).toBe(CartStatusEnum.PENDING_PAYMENT);
    expect(result).toEqual(paymentResponse);
    expect(reservationRepository.save).not.toHaveBeenCalled();
    expect(purchaseRepository.save).not.toHaveBeenCalled();
  });

  it('creates Wompi payload for cart with reservation draft and experiences', async () => {
    const reservationItem = makeDraftReservationItem();
    const cartItem = makeCartItem();
    const cart = makeCart({
      experienceItems: [cartItem],
      reservationItem,
    });
    cartRepository.findOpenByGuest.mockResolvedValue(cart);

    const guest = makeGuest({
      id: GUEST_ID,
      primaryEmail: 'guest@example.com',
      fullName: 'Guest Example',
    });
    guestRepository.findByGuestAccountId.mockResolvedValue(guest);

    const unit = makeUnit({ id: UNIT_ID, inventoryCount: 5 });
    unitRepository.findById.mockResolvedValue(unit);
    reservationRepository.findByUnitAndDateRange.mockResolvedValue([]);
    reservationRepository.save.mockResolvedValue(RESERVATION_ID);

    experienceRepository.findById.mockResolvedValue(makeExperience());
    purchaseRepository.countConfirmedByExperienceAndDate.mockResolvedValue(0);
    cartRepository.save.mockResolvedValue(cart.getId()!.toString());

    const result = await handler.execute(baseCommand);

    expect(paymentGateway.buildCheckoutPayload).toHaveBeenCalledTimes(1);
    expect(result).toEqual(paymentResponse);
    expect(reservationRepository.save).toHaveBeenCalledTimes(1);
    expect(purchaseRepository.save).not.toHaveBeenCalled();
  });

  it('expires existing session and creates new one on re-checkout', async () => {
    const reservationItem = makeDraftReservationItem();
    const cart = makeCart({ reservationItem, experienceItems: [] });
    cartRepository.findOpenByGuest.mockResolvedValue(cart);

    const guest = makeGuest({ id: GUEST_ID });
    guestRepository.findByGuestAccountId.mockResolvedValue(guest);

    const reservation = makeReservation({
      id: RESERVATION_ID,
      guestId: GUEST_ID,
      status: ReservationStatusEnum.PENDING,
    });
    reservationRepository.findById.mockResolvedValue(reservation);

    const unit = makeUnit({ id: UNIT_ID, inventoryCount: 5 });
    unitRepository.findById.mockResolvedValue(unit);
    reservationRepository.findByUnitAndDateRange.mockResolvedValue([]);

    // Mock existing pending session
    const existingSession = {
      expire: jest.fn(),
      getStatus: () => ({ isPending: () => true }),
    };
    paymentSessionRepository.findPendingByCartId.mockResolvedValue(
      existingSession,
    );

    cartRepository.save.mockResolvedValue(cart.getId()!.toString());

    const result = await handler.execute(baseCommand);

    expect(existingSession.expire).toHaveBeenCalled();
    expect(paymentSessionRepository.save).toHaveBeenCalledTimes(2); // expire + new
    expect(result).toEqual(paymentResponse);
  });

  it('throws DomainException when experience capacity exceeded', async () => {
    const experience = makeExperience();
    const cartItem = makeCartItem({ quantity: 10 });
    const cart = makeCart({ experienceItems: [cartItem] });
    cartRepository.findOpenByGuest.mockResolvedValue(cart);

    experienceRepository.findById.mockResolvedValue(experience);
    purchaseRepository.countConfirmedByExperienceAndDate.mockResolvedValue(
      experience.getCapacity(),
    );

    await expect(handler.execute(baseCommand)).rejects.toThrow(DomainException);
  });

  it('throws DomainException when unit is no longer available', async () => {
    const reservationItem = makeDraftReservationItem();
    const cart = makeCart({ reservationItem, experienceItems: [] });
    cartRepository.findOpenByGuest.mockResolvedValue(cart);
    cartRepository.findOpenByGuest.mockResolvedValue(cart);

    const guest = makeGuest({ id: GUEST_ID });
    guestRepository.findByGuestAccountId.mockResolvedValue(guest);

    const unit = makeUnit({ id: UNIT_ID, inventoryCount: 1 });
    unitRepository.findById.mockResolvedValue(unit);
    reservationRepository.findByUnitAndDateRange.mockResolvedValue([
      makeReservation({
        id: 'other',
        checkIn: new Date('2030-06-01'),
        checkOut: new Date('2030-06-03'),
        status: ReservationStatusEnum.CONFIRMED,
      }),
    ]);

    await expect(handler.execute(baseCommand)).rejects.toThrow(DomainException);
  });

  it('updates cart from frontend data before checkout', async () => {
    const cart = makeCart({ experienceItems: [] });
    cartRepository.findOpenByGuest.mockResolvedValue(cart);

    const unit = makeUnit({ id: UNIT_ID, inventoryCount: 5 });
    unitRepository.findById.mockResolvedValue(unit);
    reservationRepository.findByUnitAndDateRange.mockResolvedValue([]);

    const guest = makeGuest({ id: GUEST_ID });
    guestRepository.findByGuestAccountId.mockResolvedValue(guest);

    cartRepository.save.mockResolvedValue(cart.getId()!.toString());

    const commandWithData = new CheckoutCartCommand(
      GUEST_ACCOUNT_ID,
      TENANT_ID,
      'guest@example.com',
      {
        tenantId: TENANT_ID,
        propertyId: PROPERTY_ID,
        unitId: UNIT_ID,
        checkIn: new Date('2030-06-01'),
        checkOut: new Date('2030-06-05'),
        guestsCount: 2,
        pricePerNight: 150000,
        notes: null,
      },
    );

    const result = await handler.execute(commandWithData);

    expect(result).toEqual(paymentResponse);
    // Cart should have been updated with the new reservation data
    expect(cartRepository.save).toHaveBeenCalled();
  });
});
