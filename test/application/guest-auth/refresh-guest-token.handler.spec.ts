import { UnauthorizedException } from '@nestjs/common';
import { RefreshGuestTokenCommand } from '@/application/guest-auth/commands/refresh-guest-token/refresh-guest-token.command';
import { RefreshGuestTokenHandler } from '@/application/guest-auth/commands/refresh-guest-token/refresh-guest-token.handler';
import { RefreshGuestTokenResult } from '@/application/guest-auth/commands/refresh-guest-token/refresh-guest-token.result';
import { IGuestTokenService } from '@/application/guest-auth/services/guest-jwt.service';
import { createGuestTokenServiceMock } from '@test/shared/mocks/services/guest-token-service.mock';

describe('RefreshGuestTokenHandler', () => {
  let handler: RefreshGuestTokenHandler;
  let tokenService: jest.Mocked<IGuestTokenService>;

  beforeEach(() => {
    tokenService = createGuestTokenServiceMock();
    handler = new RefreshGuestTokenHandler(tokenService);
  });

  it('throws UnauthorizedException when refresh token is invalid', async () => {
    tokenService.verifyToken.mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(
      handler.execute(new RefreshGuestTokenCommand('invalid-token')),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid or expired refresh token'),
    );
  });

  it('returns new tokens when refresh token is valid', async () => {
    tokenService.verifyToken.mockReturnValue({
      type: 'guest',
      guestAccountId: '65f1a1a2-b3c4-d5e6-f7a8-b9d000000000',
      email: 'guest@example.com',
      emailVerified: true,
    });

    const result = await handler.execute(
      new RefreshGuestTokenCommand('guest-refresh-token'),
    );

    expect(result).toBeInstanceOf(RefreshGuestTokenResult);
    expect(result.accessToken).toBe('guest-access-token');
    expect(result.refreshToken).toBe('guest-refresh-token');
  });
});
