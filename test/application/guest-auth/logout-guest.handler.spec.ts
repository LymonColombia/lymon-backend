import { LogoutGuestCommand } from '@/application/guest-auth/commands/logout-guest/logout-guest.command';
import { LogoutGuestHandler } from '@/application/guest-auth/commands/logout-guest/logout-guest.handler';
import { LogoutGuestResult } from '@/application/guest-auth/commands/logout-guest/logout-guest.result';

describe('LogoutGuestHandler', () => {
  let handler: LogoutGuestHandler;

  beforeEach(() => {
    handler = new LogoutGuestHandler();
  });

  it('is idempotent and returns success', async () => {
    const result = await handler.execute(
      new LogoutGuestCommand('missing-token'),
    );

    expect(result).toBeInstanceOf(LogoutGuestResult);
    expect(result.message).toBe('Logout successful');
  });
});
