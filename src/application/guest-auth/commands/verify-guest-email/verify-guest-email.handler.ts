import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException, Inject } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { VerifyGuestEmailCommand } from '@/application/guest-auth/commands/verify-guest-email/verify-guest-email.command';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';

export class VerifyGuestEmailResult {
  constructor(public readonly message: string) {}
}

@CommandHandler(VerifyGuestEmailCommand)
export class VerifyGuestEmailHandler implements ICommandHandler<VerifyGuestEmailCommand> {
  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
  ) {}

  async execute(
    command: VerifyGuestEmailCommand,
  ): Promise<VerifyGuestEmailResult> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(command.token)
      .digest('hex');

    const account =
      await this.guestAccountRepository.findByEmailVerificationToken(
        hashedToken,
      );

    if (!account) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (!account.isEmailVerificationTokenValid(new Date())) {
      throw new UnauthorizedException('Verification token has expired');
    }

    if (account.isEmailVerified()) {
      return new VerifyGuestEmailResult('Email already verified');
    }

    account.verifyEmail();
    await this.guestAccountRepository.save(account);

    return new VerifyGuestEmailResult('Email verified successfully');
  }
}
