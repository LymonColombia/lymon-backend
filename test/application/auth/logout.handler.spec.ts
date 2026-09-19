import { LogoutCommand } from '@/application/auth/commands/logout.command';
import {
  LogoutHandler,
  LogoutResult,
} from '@/application/auth/commands/logout.handler';

describe('LogoutHandler', () => {
  let handler: LogoutHandler;

  beforeEach(() => {
    handler = new LogoutHandler();
  });

  it('is idempotent and returns success', async () => {
    const result = await handler.execute(new LogoutCommand('missing-token'));

    expect(result).toBeInstanceOf(LogoutResult);
    expect(result.message).toBe('Logout successful');
  });
});
