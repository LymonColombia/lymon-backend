import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { RecoverGuestPasswordCommand } from '@/application/guest-auth/commands/recover-guest-password/recover-guest-password.command';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '@/application/shared/services/email.service';
import { Email } from '@/domain/shared/value-objects/email.vo';

export class RecoverGuestPasswordResult {
  constructor(public readonly message: string) {}
}

@CommandHandler(RecoverGuestPasswordCommand)
export class RecoverGuestPasswordHandler implements ICommandHandler<RecoverGuestPasswordCommand> {
  private readonly logger = new Logger(RecoverGuestPasswordHandler.name);

  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
  ) {}

  async execute(
    command: RecoverGuestPasswordCommand,
  ): Promise<RecoverGuestPasswordResult> {
    const message = 'If the email exists, a recovery link has been sent';

    try {
      const email = Email.create(command.email);
      const account = await this.guestAccountRepository.findByEmail(email);

      if (!account) {
        return new RecoverGuestPasswordResult(message);
      }

      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(plainToken)
        .digest('hex');
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      account.setResetToken(hashedToken, expiry);
      await this.guestAccountRepository.save(account);

      await this.emailService.sendRecoveryEmail(email.toString(), plainToken);
    } catch (error) {
      this.logger.error(
        `Guest password recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return new RecoverGuestPasswordResult(message);
  }
}
