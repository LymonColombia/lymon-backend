import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { RefreshGuestTokenCommand } from '@/application/guest-auth/commands/refresh-guest-token/refresh-guest-token.command';
import { RefreshGuestTokenResult } from '@/application/guest-auth/commands/refresh-guest-token/refresh-guest-token.result';
import {
  GUEST_TOKEN_SERVICE,
  type GuestJwtPayload,
  type IGuestTokenService,
} from '@/application/guest-auth/services/guest-jwt.service';

@CommandHandler(RefreshGuestTokenCommand)
export class RefreshGuestTokenHandler implements ICommandHandler<RefreshGuestTokenCommand> {
  constructor(
    @Inject(GUEST_TOKEN_SERVICE)
    private readonly tokenService: IGuestTokenService,
  ) {}

  execute(command: RefreshGuestTokenCommand): Promise<RefreshGuestTokenResult> {
    let payload: GuestJwtPayload;

    try {
      payload = this.tokenService.verifyToken(command.refreshToken);
    } catch {
      return Promise.reject(
        new UnauthorizedException('Invalid or expired refresh token'),
      );
    }

    const cleanPayload: GuestJwtPayload = {
      type: 'guest',
      guestAccountId: payload.guestAccountId,
      email: payload.email,
      emailVerified: payload.emailVerified,
    };

    const accessToken = this.tokenService.generateAccessToken(cleanPayload);
    const refreshToken = this.tokenService.generateRefreshToken(cleanPayload);

    return Promise.resolve(
      new RefreshGuestTokenResult(accessToken, refreshToken),
    );
  }
}
