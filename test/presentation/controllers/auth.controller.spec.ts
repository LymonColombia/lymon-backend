import { CommandBus } from '@nestjs/cqrs';
import { AuthController } from '@/presentation/controllers/auth.controller';
import { LogoutCommand } from '@/application/auth/commands/logout.command';

describe('AuthController', () => {
  let controller: AuthController;
  let commandBus: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    controller = new AuthController(commandBus as unknown as CommandBus);
  });

  it('logout returns message', async () => {
    commandBus.execute.mockResolvedValue({ message: 'Logout successful' });

    const result = await controller.logout({ refreshToken: 'refresh' });

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(LogoutCommand));
    expect(result).toEqual({ message: 'Logout successful' });
  });
});
