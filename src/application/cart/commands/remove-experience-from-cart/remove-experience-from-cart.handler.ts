import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveExperienceFromCartCommand } from './remove-experience-from-cart.command';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '@/domain/cart/repositories/cart.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';

@CommandHandler(RemoveExperienceFromCartCommand)
export class RemoveExperienceFromCartHandler implements ICommandHandler<RemoveExperienceFromCartCommand> {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
  ) {}

  async execute(command: RemoveExperienceFromCartCommand): Promise<void> {
    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );

    const cart = await this.cartRepository.findOpenByGuest(guestAccountId);
    if (!cart) {
      throw new NotFoundException('No open cart found');
    }

    cart.removeExperienceItem(
      ExperienceId.create(command.experienceId),
      command.selectedDate ?? null,
    );
    await this.cartRepository.save(cart);
  }
}
