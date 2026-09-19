import * as crypto from 'node:crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ConflictException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdateGuestAccountProfileCommand } from './update-guest-account-profile.command';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { Email } from '@/domain/shared/value-objects/email.vo';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '@/application/shared/services/email.service';

export class UpdateGuestAccountProfileResult {
  constructor(public readonly message: string) {}
}

@CommandHandler(UpdateGuestAccountProfileCommand)
export class UpdateGuestAccountProfileHandler implements ICommandHandler<UpdateGuestAccountProfileCommand> {
  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
  ) {}

  async execute(
    command: UpdateGuestAccountProfileCommand,
  ): Promise<UpdateGuestAccountProfileResult> {
    const account = await this.guestAccountRepository.findById(
      GuestAccountId.createFromString(command.guestAccountId),
    );

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    if (command.firstName !== undefined) {
      account.setFirstName(command.firstName);
    }

    if (command.lastName !== undefined) {
      account.setLastName(command.lastName);
    }

    if (command.phone !== undefined) {
      account.setPhone(command.phone);
    }

    if (command.email !== undefined) {
      const email = Email.create(command.email);
      const existing = await this.guestAccountRepository.findByEmail(email);
      if (existing && existing.getId()?.toString() !== command.guestAccountId) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(plainToken)
        .digest('hex');
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      account.initEmailChange(email, hashedToken, expiry);
      await this.guestAccountRepository.save(account);
      await this.emailService.sendVerificationEmail(
        email.toString(),
        plainToken,
      );

      return new UpdateGuestAccountProfileResult(
        'Profile updated. Check your new email to confirm the change.',
      );
    }

    await this.guestAccountRepository.save(account);
    return new UpdateGuestAccountProfileResult('Profile updated successfully');
  }
}
