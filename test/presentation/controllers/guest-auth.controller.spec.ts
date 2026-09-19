import { CommandBus } from '@nestjs/cqrs';
import { GuestAuthController } from '@/presentation/controllers/guest-auth.controller';
import { LogoutGuestCommand } from '@/application/guest-auth/commands/logout-guest/logout-guest.command';

describe('GuestAuthController', () => {
  let controller: GuestAuthController;
  let commandBus: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    controller = new GuestAuthController(commandBus as unknown as CommandBus);
  });

  it('logout returns message', async () => {
    commandBus.execute.mockResolvedValue({ message: 'Logout successful' });

    const result = await controller.logout({ refreshToken: 'refresh-token' });

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(LogoutGuestCommand),
    );
    expect(result).toEqual({ message: 'Logout successful' });
  });
});
