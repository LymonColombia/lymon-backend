import * as crypto from 'node:crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ConflictException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfirmGuestAccountEmailChangeCommand } from './confirm-guest-account-email-change.command';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';

export class ConfirmGuestAccountEmailChangeResult {
  constructor(public readonly message: string) {}
}

@CommandHandler(ConfirmGuestAccountEmailChangeCommand)
export class ConfirmGuestAccountEmailChangeHandler implements ICommandHandler<ConfirmGuestAccountEmailChangeCommand> {
  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
  ) {}

  async execute(
    command: ConfirmGuestAccountEmailChangeCommand,
  ): Promise<ConfirmGuestAccountEmailChangeResult> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(command.token)
      .digest('hex');

    const account =
      await this.guestAccountRepository.findByEmailChangeToken(hashedToken);

    if (!account?.isEmailChangeTokenValid(new Date())) {
      throw new UnauthorizedException('Invalid or expired email change token');
    }

    const pending = account.getPendingEmail()!;
    const existing = await this.guestAccountRepository.findByEmail(pending);
    if (
      existing &&
      existing.getId()?.toString() !== account.getId()?.toString()
    ) {
      account.clearEmailChange();
      await this.guestAccountRepository.save(account);
      throw new ConflictException('An account with this email already exists');
    }

    account.confirmEmailChange();
    await this.guestAccountRepository.save(account);

    return new ConfirmGuestAccountEmailChangeResult(
      'Email updated successfully',
    );
  }
}
