import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from '@/application/auth/commands/logout.command';

export class LogoutResult {
  constructor(public readonly message: string) {}
}

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor() {}

  execute(command: LogoutCommand): Promise<LogoutResult> {
    const refreshToken = command.refreshToken;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return Promise.resolve(new LogoutResult('Logout successful'));
    }

    return Promise.resolve(new LogoutResult('Logout successful'));
  }
}
