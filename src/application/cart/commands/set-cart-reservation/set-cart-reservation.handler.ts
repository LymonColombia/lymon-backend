import { Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SetCartReservationCommand } from './set-cart-reservation.command';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '@/domain/cart/repositories/cart.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { Cart } from '@/domain/cart/entities/cart.entity';
import { CartReservationItem } from '@/domain/cart/value-objects/cart-reservation-item.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import { AvailabilityChecker } from '@/domain/reservation/services/availability-checker.domain-service';

@CommandHandler(SetCartReservationCommand)
export class SetCartReservationHandler implements ICommandHandler<SetCartReservationCommand> {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(command: SetCartReservationCommand): Promise<void> {
    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );
    const tenantId = TenantId.createFromString(command.tenantId);
    const unitId = UnitId.create(command.unitId);

    const unit = await this.unitRepository.findById(unitId);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const dateRange = DateRange.create(command.checkIn, command.checkOut);

    const existingReservations =
      await this.reservationRepository.findByUnitAndDateRange(unitId, dateRange);

    if (
      !AvailabilityChecker.isAvailable(
        dateRange,
        existingReservations,
        unit.getInventoryCount(),
      )
    ) {
      throw new ConflictException(
        'Unit is not available for the requested dates',
      );
    }

    const nights = dateRange.nights();
    const totalPrice = command.pricePerNight * nights;

    let cart = await this.cartRepository.findOpenByGuest(guestAccountId);
    cart ??= Cart.create({ guestAccountId });

    cart.setReservationItem(
      CartReservationItem.create({
        tenantId: command.tenantId,
        propertyId: command.propertyId,
        unitId: command.unitId,
        checkIn: command.checkIn,
        checkOut: command.checkOut,
        guestsCount: command.guestsCount,
        notes: command.notes,
        pricePerNight: command.pricePerNight,
        totalPriceCopSnapshot: totalPrice,
        reservationId: null,
      }),
    );

    await this.cartRepository.save(cart);
  }
}
