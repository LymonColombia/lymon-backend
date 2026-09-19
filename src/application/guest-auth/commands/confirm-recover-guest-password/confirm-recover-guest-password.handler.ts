import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { ConfirmRecoverGuestPasswordCommand } from '@/application/guest-auth/commands/confirm-recover-guest-password/confirm-recover-guest-password.command';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import {
  PASSWORD_HASHER,
  type IPasswordHasher,
} from '@/application/auth/services/password-hasher.service';

export class ConfirmRecoverGuestPasswordResult {
  constructor(public readonly message: string) {}
}

@CommandHandler(ConfirmRecoverGuestPasswordCommand)
export class ConfirmRecoverGuestPasswordHandler implements ICommandHandler<ConfirmRecoverGuestPasswordCommand> {
  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(
    command: ConfirmRecoverGuestPasswordCommand,
  ): Promise<ConfirmRecoverGuestPasswordResult> {
    if (command.newPassword !== command.newPasswordConfirmation) {
      throw new UnauthorizedException('Passwords do not match');
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(command.token)
      .digest('hex');

    const account =
      await this.guestAccountRepository.findByPasswordResetToken(hashedToken);

    if (!account) {
      throw new UnauthorizedException('Invalid or expired recovery token');
    }

    if (!account.isResetTokenValid(new Date())) {
      account.clearResetToken();
      await this.guestAccountRepository.save(account);
      throw new UnauthorizedException('Invalid or expired recovery token');
    }

    const newPasswordHash = await this.passwordHasher.hash(command.newPassword);
    account.resetPassword(newPasswordHash, new Date());
    await this.guestAccountRepository.save(account);

    return new ConfirmRecoverGuestPasswordResult(
      'Password has been reset successfully',
    );
  }
}
