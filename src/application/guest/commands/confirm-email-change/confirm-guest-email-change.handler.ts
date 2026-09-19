import * as crypto from 'node:crypto';
import { BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { ConfirmGuestEmailChangeCommand } from './confirm-guest-email-change.command';

@CommandHandler(ConfirmGuestEmailChangeCommand)
export class ConfirmGuestEmailChangeHandler implements ICommandHandler<ConfirmGuestEmailChangeCommand> {
  constructor(
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(command: ConfirmGuestEmailChangeCommand): Promise<void> {
    const hashed = crypto
      .createHash('sha256')
      .update(command.token)
      .digest('hex');

    const guest = await this.guestRepository.findByEmailChangeToken(hashed);

    if (!guest?.isEmailChangeTokenValid(new Date())) {
      throw new BadRequestException('Invalid or expired email change token');
    }

    const pending = guest.getPendingEmail()!;
    const existing = await this.guestRepository.findByPrimaryEmail(
      guest.getTenantId(),
      pending,
    );
    if (
      existing &&
      existing.getId()?.toString() !== guest.getId()?.toString()
    ) {
      guest.clearEmailChange();
      await this.guestRepository.save(guest);
      throw new ConflictException(
        'A guest with this primary email already exists',
      );
    }

    guest.confirmEmailChange();
    await this.guestRepository.save(guest);
  }
}
