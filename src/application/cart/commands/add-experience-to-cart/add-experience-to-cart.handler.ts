import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddExperienceToCartCommand } from './add-experience-to-cart.command';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '@/domain/cart/repositories/cart.repository';
import {
  EXPERIENCE_REPOSITORY,
  type ExperienceRepository,
} from '@/domain/experience/repositories/experience.repository';
import { Cart } from '@/domain/cart/entities/cart.entity';
import { CartItem } from '@/domain/cart/value-objects/cart-item.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperienceStatusEnum } from '@/domain/experience/value-objects/experience-status.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

@CommandHandler(AddExperienceToCartCommand)
export class AddExperienceToCartHandler implements ICommandHandler<AddExperienceToCartCommand> {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(EXPERIENCE_REPOSITORY)
    private readonly experienceRepository: ExperienceRepository,
  ) {}

  async execute(command: AddExperienceToCartCommand): Promise<void> {
    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );
    const experienceId = ExperienceId.create(command.experienceId);

    const experience = await this.experienceRepository.findById(experienceId);
    if (!experience) {
      throw new NotFoundException('Experience not found');
    }
    if (experience.getStatus().toString() !== ExperienceStatusEnum.ACTIVE) {
      throw new DomainException('Experience is not available for purchase');
    }

    const hasReservation = !!command.reservationId;
    if (hasReservation && !experience.getAllowReservationPurchase()) {
      throw new DomainException(
        'This experience cannot be purchased as a reservation add-on',
      );
    }
    if (!hasReservation && !experience.getAllowStandalonePurchase()) {
      throw new DomainException(
        'This experience cannot be purchased standalone',
      );
    }
    experience.validateParticipantQuantity(command.quantity);

    let cart = await this.cartRepository.findOpenByGuest(guestAccountId);
    cart ??= Cart.create({ guestAccountId });

    const item = CartItem.create({
      tenantId: command.tenantId,
      experienceId,
      experienceName: experience.getName(),
      selectedDate: command.selectedDate ?? null,
      quantity: command.quantity,
      unitPriceCopSnapshot: experience.getPriceCop(),
      reservationId: command.reservationId ?? null,
    });

    cart.addExperienceItem(item);
    await this.cartRepository.save(cart);
  }
}
