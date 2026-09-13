import { NotFoundException, ConflictException } from '@nestjs/common';
import { SetCartReservationHandler } from '@/application/cart/commands/set-cart-reservation/set-cart-reservation.handler';
import { SetCartReservationCommand } from '@/application/cart/commands/set-cart-reservation/set-cart-reservation.command';
import { createCartRepositoryMock } from '@test/shared/mocks/repositories/cart-repository.mock';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { makeCart } from '@test/shared/fixtures/cart.fixture';
import { makeUnit } from '@test/shared/fixtures/unit.fixture';
import { makeReservation } from '@test/shared/fixtures/reservation.fixture';

const GUEST_ACCOUNT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000';
const PROPERTY_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000';
const UNIT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000';

const command = new SetCartReservationCommand(
  GUEST_ACCOUNT_ID,
  TENANT_ID,
  PROPERTY_ID,
  UNIT_ID,
  new Date('2030-06-01'),
  new Date('2030-06-05'),
  2,
  100000,
  null,
  'guest@example.com',
);

describe('SetCartReservationHandler', () => {
  let handler: SetCartReservationHandler;
  let cartRepository: ReturnType<typeof createCartRepositoryMock>;
  let reservationRepository: ReturnType<typeof createReservationRepositoryMock>;
  let unitRepository: ReturnType<typeof createUnitRepositoryMock>;

  beforeEach(() => {
    cartRepository = createCartRepositoryMock();
    reservationRepository = createReservationRepositoryMock();
    unitRepository = createUnitRepositoryMock();
    handler = new SetCartReservationHandler(
      cartRepository,
      unitRepository,
      reservationRepository,
    );
  });

  it('sets reservation draft on existing cart when unit is available', async () => {
    const unit = makeUnit({ id: UNIT_ID, pricePerNight: 100000 });
    unitRepository.findById.mockResolvedValue(unit);
    reservationRepository.findByUnitAndDateRange.mockResolvedValue([]);

    const cart = makeCart();
    cartRepository.findOpenByGuest.mockResolvedValue(cart);
    cartRepository.findOpenByGuest.mockResolvedValue(cart);
    cartRepository.save.mockResolvedValue(cart.getId()!.toString());

    await handler.execute(command);

    expect(cartRepository.save).toHaveBeenCalledTimes(1);
    const savedCart = cartRepository.save.mock.calls[0][0];
    const item = savedCart.getReservationItem();
    expect(item).not.toBeNull();
    expect(item!.propertyId).toBe(PROPERTY_ID);
    expect(item!.unitId).toBe(UNIT_ID);
    expect(item!.totalPriceCopSnapshot).toBe(400000); // 100000 * 4 nights
    expect(item!.pricePerNight).toBe(100000);
    expect(item!.reservationId).toBeNull();
  });

  it('creates new cart if none exists', async () => {
    const unit = makeUnit({ id: UNIT_ID, pricePerNight: 100000 });
    unitRepository.findById.mockResolvedValue(unit);
    reservationRepository.findByUnitAndDateRange.mockResolvedValue([]);

    cartRepository.findOpenByGuest.mockResolvedValue(null);
    cartRepository.findOpenByGuest.mockResolvedValue(null);
    cartRepository.save.mockResolvedValue('new-cart-id');

    await handler.execute(command);

    expect(cartRepository.save).toHaveBeenCalledTimes(1);
    const savedCart = cartRepository.save.mock.calls[0][0];
    expect(savedCart.getReservationItem()).not.toBeNull();
  });

  it('throws NotFoundException when unit not found', async () => {
    unitRepository.findById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when unit is not available', async () => {
    const unit = makeUnit({ id: UNIT_ID, inventoryCount: 1 });
    unitRepository.findById.mockResolvedValue(unit);
    reservationRepository.findByUnitAndDateRange.mockResolvedValue([
      makeReservation({
        id: 'other-res',
        checkIn: new Date('2030-06-01'),
        checkOut: new Date('2030-06-03'),
        status: 'CONFIRMED' as any,
      }),
    ]);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });
});
