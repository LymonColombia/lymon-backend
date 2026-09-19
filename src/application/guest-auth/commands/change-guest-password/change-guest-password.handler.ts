import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { ChangeGuestPasswordCommand } from '@/application/guest-auth/commands/change-guest-password/change-guest-password.command';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import {
  PASSWORD_HASHER,
  type IPasswordHasher,
} from '@/application/auth/services/password-hasher.service';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';

export class ChangeGuestPasswordResult {
  constructor(public readonly message: string) {}
}

@CommandHandler(ChangeGuestPasswordCommand)
export class ChangeGuestPasswordHandler implements ICommandHandler<ChangeGuestPasswordCommand> {
  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(
    command: ChangeGuestPasswordCommand,
  ): Promise<ChangeGuestPasswordResult> {
    const account = await this.guestAccountRepository.findById(
      GuestAccountId.createFromString(command.guestAccountId),
    );

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    const isCurrentPasswordValid = await this.passwordHasher.compare(
      command.currentPassword,
      account.getPasswordHash(),
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await this.passwordHasher.compare(
      command.newPassword,
      account.getPasswordHash(),
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password cannot be the same as the current password',
      );
    }

    const newPasswordHash = await this.passwordHasher.hash(command.newPassword);
    account.changePassword(newPasswordHash);
    await this.guestAccountRepository.save(account);

    return new ChangeGuestPasswordResult('Password changed successfully');
  }
}
