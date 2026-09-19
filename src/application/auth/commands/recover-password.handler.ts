import { RecoverPasswordCommand } from '@/application/auth/commands/recover-password.command';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '@/application/shared/services/email.service';
import { Email } from '@/domain/shared/value-objects/email.vo';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';

export class RecoverPasswordResult {
  constructor(public readonly message: string) {}
}

@CommandHandler(RecoverPasswordCommand)
export class RecoverPasswordHandler implements ICommandHandler<RecoverPasswordCommand> {
  private readonly logger = new Logger(RecoverPasswordHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
  ) {}

  async execute(
    command: RecoverPasswordCommand,
  ): Promise<RecoverPasswordResult> {
    const message = 'If the email exists, a recovery link has been sent';

    try {
      const email = Email.create(command.email);
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        return new RecoverPasswordResult(message);
      }

      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = this.hashResetToken(plainToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      user.setResetToken(hashedToken, expiresAt);
      await this.userRepository.save(user);

      await this.emailService.sendRecoveryEmail(command.email, plainToken);

      return new RecoverPasswordResult(message);
    } catch (error) {
      this.logger.error(
        `Recover password failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return new RecoverPasswordResult(message);
    }
  }

  private hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
