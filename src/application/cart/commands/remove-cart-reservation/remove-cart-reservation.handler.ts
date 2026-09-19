import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveCartReservationCommand } from './remove-cart-reservation.command';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '@/domain/cart/repositories/cart.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';

@CommandHandler(RemoveCartReservationCommand)
export class RemoveCartReservationHandler implements ICommandHandler<RemoveCartReservationCommand> {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
  ) {}

  async execute(command: RemoveCartReservationCommand): Promise<void> {
    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );

    const cart = await this.cartRepository.findOpenByGuest(guestAccountId);
    if (!cart) {
      throw new NotFoundException('No open cart found');
    }

    cart.removeReservationItem();
    await this.cartRepository.save(cart);
  }
}
