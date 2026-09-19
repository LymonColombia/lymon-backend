import { ConfirmRecoverPasswordCommand } from '@/application/auth/commands/confirm-recover-password.command';
import {
  PASSWORD_HASHER,
  type IPasswordHasher,
} from '@/application/auth/services/password-hasher.service';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as crypto from 'node:crypto';

export class ConfirmRecoverPasswordResult {
  constructor(public readonly message: string) {}
}

@CommandHandler(ConfirmRecoverPasswordCommand)
export class ConfirmRecoverPasswordHandler implements ICommandHandler<ConfirmRecoverPasswordCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(
    command: ConfirmRecoverPasswordCommand,
  ): Promise<ConfirmRecoverPasswordResult> {
    if (command.newPassword !== command.newPasswordConfirmation) {
      throw new UnauthorizedException('Passwords do not match');
    }

    const hashedToken = this.hashResetToken(command.token);

    const user = await this.userRepository.findByResetToken(hashedToken);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired recovery token');
    }

    if (!user.isResetTokenValid(new Date())) {
      user.clearResetToken();
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid or expired recovery token');
    }

    const newPasswordHash = await this.passwordHasher.hash(command.newPassword);
    user.resetPasswordWithToken(newPasswordHash, new Date());
    await this.userRepository.save(user);

    return new ConfirmRecoverPasswordResult(
      'Password has been reset successfully',
    );
  }

  private hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
