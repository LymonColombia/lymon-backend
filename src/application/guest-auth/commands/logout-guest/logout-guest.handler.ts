import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutGuestCommand } from '@/application/guest-auth/commands/logout-guest/logout-guest.command';
import { LogoutGuestResult } from '@/application/guest-auth/commands/logout-guest/logout-guest.result';

@CommandHandler(LogoutGuestCommand)
export class LogoutGuestHandler implements ICommandHandler<LogoutGuestCommand> {
  constructor() {}

  execute(command: LogoutGuestCommand): Promise<LogoutGuestResult> {
    const refreshToken = command.refreshToken;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return Promise.resolve(new LogoutGuestResult('Logout successful'));
    }

    return Promise.resolve(new LogoutGuestResult('Logout successful'));
  }
}
