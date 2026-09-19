import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenCommand } from './refresh-token.command';
import {
  type ITokenService,
  type JwtPayload,
  TOKEN_SERVICE,
} from '@/application/auth/services/jwt.service';

export class RefreshTokenResult {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand> {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
  ) {}

  execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    let payload: JwtPayload;

    try {
      payload = this.tokenService.verifyToken(command.refreshToken);
    } catch {
      return Promise.reject(
        new UnauthorizedException('Invalid or expired refresh token'),
      );
    }

    const cleanPayload: JwtPayload = {
      userId: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId,
      activePlan: payload.activePlan,
      isOwner: payload.isOwner,
      emailVerified: payload.emailVerified,
      roleAssignments: payload.roleAssignments,
      trialEndsAt: payload.trialEndsAt,
    };

    const accessToken = this.tokenService.generateAccesToken(cleanPayload);
    const refreshToken = this.tokenService.generateRefreshToken(cleanPayload);

    return Promise.resolve(new RefreshTokenResult(accessToken, refreshToken));
  }
}
