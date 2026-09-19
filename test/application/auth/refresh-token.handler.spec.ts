import { UnauthorizedException } from '@nestjs/common';
import {
  RefreshTokenHandler,
  RefreshTokenResult,
} from '@/application/auth/commands/refresh-token.handler';
import { RefreshTokenCommand } from '@/application/auth/commands/refresh-token.command';
import { ITokenService } from '@/application/auth/services/jwt.service';
import { createTokenServiceMock } from '@test/shared/mocks/services/token-service.mock';

describe('RefreshTokenHandler', () => {
  let handler: RefreshTokenHandler;
  let tokenService: jest.Mocked<ITokenService>;

  beforeEach(() => {
    tokenService = createTokenServiceMock();

    handler = new RefreshTokenHandler(tokenService);
  });

  it('throws UnauthorizedException when refresh token is invalid', async () => {
    tokenService.verifyToken.mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(
      handler.execute(new RefreshTokenCommand('invalid-token')),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid or expired refresh token'),
    );
  });

  it('returns new tokens when token is valid', async () => {
    tokenService.verifyToken.mockReturnValue({
      userId: 'user-1',
      email: 'user@example.com',
      tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      activePlan: 'BASIC',
      isOwner: true,
      emailVerified: true,
      roleAssignments: [],
    });

    const result = await handler.execute(
      new RefreshTokenCommand('refresh-token'),
    );

    expect(result).toBeInstanceOf(RefreshTokenResult);
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });
});
