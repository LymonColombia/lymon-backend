import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { GuestJwtPayload } from '@/application/guest-auth/services/guest-jwt.service';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { GuestAccountStatusEnum } from '@/domain/guest-account/value-objects/guest-account-status.vo';

@Injectable()
export class GuestJwtStrategy extends PassportStrategy(Strategy, 'guest-jwt') {
  private readonly logger = new Logger(GuestJwtStrategy.name);

  constructor(
    configService: ConfigService,
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET')?.toString();
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: GuestJwtPayload & { iat: number }) {
    this.logger.debug(
      `validate() payload=${JSON.stringify(payload)}`,
    );

    // Reject staff tokens on guest endpoints
    if (payload.type !== 'guest') {
      this.logger.warn(
        `Rejected token: type is "${payload.type}", expected "guest" (probably a staff token was used on a guest endpoint)`,
      );
      throw new UnauthorizedException('Invalid token type');
    }

    const account = await this.guestAccountRepository.findById(
      GuestAccountId.createFromString(payload.guestAccountId),
    );

    if (!account) {
      this.logger.warn(
        `Rejected token: no guest account found for guestAccountId=${payload.guestAccountId}`,
      );
      throw new UnauthorizedException('Guest account no longer exists');
    }

    if (account.getStatus() === GuestAccountStatusEnum.SUSPENDED) {
      this.logger.warn(
        `Rejected token: guestAccountId=${payload.guestAccountId} is SUSPENDED`,
      );
      throw new UnauthorizedException('Guest account is suspended');
    }

    const passwordChangedAt = account.getPasswordChangedAt();
    if (passwordChangedAt) {
      const changedTimestamp = Math.floor(passwordChangedAt.getTime() / 1000);
      if (payload.iat < changedTimestamp) {
        this.logger.warn(
          `Rejected token: issued at ${payload.iat} before password change at ${changedTimestamp} (guestAccountId=${payload.guestAccountId})`,
        );
        throw new UnauthorizedException(
          'Session invalidated due to password change',
        );
      }
    }

    this.logger.debug(
      `Token accepted for guestAccountId=${payload.guestAccountId}`,
    );

    return {
      type: 'guest' as const,
      guestAccountId: payload.guestAccountId,
      email: payload.email,
      emailVerified: payload.emailVerified,
    };
  }
}
