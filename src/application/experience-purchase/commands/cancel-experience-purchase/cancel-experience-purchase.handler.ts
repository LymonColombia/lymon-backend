import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelExperiencePurchaseCommand } from './cancel-experience-purchase.command';
import {
  EXPERIENCE_PURCHASE_REPOSITORY,
  type ExperiencePurchaseRepository,
} from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { ExperiencePurchaseId } from '@/domain/experience-purchase/value-objects/experience-purchase-id.vo';

@CommandHandler(CancelExperiencePurchaseCommand)
export class CancelExperiencePurchaseHandler implements ICommandHandler<
  CancelExperiencePurchaseCommand,
  void
> {
  constructor(
    @Inject(EXPERIENCE_PURCHASE_REPOSITORY)
    private readonly purchaseRepository: ExperiencePurchaseRepository,
  ) {}

  async execute(command: CancelExperiencePurchaseCommand): Promise<void> {
    const purchase = await this.purchaseRepository.findById(
      ExperiencePurchaseId.createFromString(command.purchaseId),
    );

    if (!purchase) {
      throw new NotFoundException('Experience purchase not found');
    }

    const { actor } = command;
    const isOwner =
      actor.type === 'tenant'
        ? purchase.getTenantId().toString() === actor.tenantId
        : purchase.getGuestAccountId().toString() === actor.guestAccountId;

    if (!isOwner) {
      throw new ForbiddenException(
        'You do not have access to this reservation.',
      );
    }

    purchase.cancel();

    await this.purchaseRepository.save(purchase);
  }
}
