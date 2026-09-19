import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { RegisterGuestAccountCommand } from '@/application/guest-auth/commands/register-guest-account/register-guest-account.command';
import { RegisterGuestAccountResult } from '@/application/guest-auth/commands/register-guest-account/register-guest-account.result';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import {
  PASSWORD_HASHER,
  type IPasswordHasher,
} from '@/application/auth/services/password-hasher.service';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '@/application/shared/services/email.service';
import { GuestAccount } from '@/domain/guest-account/entities/guest-account.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';

@CommandHandler(RegisterGuestAccountCommand)
export class RegisterGuestAccountHandler implements ICommandHandler<RegisterGuestAccountCommand> {
  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
  ) {}

  async execute(
    command: RegisterGuestAccountCommand,
  ): Promise<RegisterGuestAccountResult> {
    const email = Email.create(command.email);

    const existing = await this.guestAccountRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    const account = GuestAccount.create({
      fullName: command.fullName,
      firstName: command.firstName,
      lastName: command.lastName,
      email,
      passwordHash,
    });

    // Generate verification token — plain sent in email, hashed stored in DB
    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hash(plainToken);
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

    account.setEmailVerificationToken(hashedToken, expiry);

    const id = await this.guestAccountRepository.save(account);

    await this.emailService.sendVerificationEmail(email.toString(), plainToken);

    return new RegisterGuestAccountResult(
      id,
      email.toString(),
      'Registration successful. Please check your email to verify your account.',
    );
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
