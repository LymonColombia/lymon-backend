import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@/application/auth/services/jwt.service';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { UserId } from '@/domain/user/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {
    const JWT_SECRET = configService.get<string>('JWT_SECRET')?.toString();
    if (!JWT_SECRET) {
      throw new Error(
        'JWT_SECRET no está definida en las variables de entorno',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload & { iat: number }) {
    const user = await this.userRepository.findById(
      UserId.createFromString(payload.userId),
    );

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const passwordChangedAt = user.getPasswordChangedAt();
    if (passwordChangedAt) {
      const passwordChangedTimestamp = Math.floor(
        passwordChangedAt.getTime() / 1000,
      );

      if (payload.iat < passwordChangedTimestamp) {
        throw new UnauthorizedException(
          'Session invalidated due to password change',
        );
      }
    }

    return {
      userId: payload.userId,
      email: payload.email,
      activePlan: payload.activePlan,
      tenantId: payload.tenantId,
      isOwner: payload.isOwner,
      roleAssignments: payload.roleAssignments,
      emailVerified: payload.emailVerified,
    };
  }
}
