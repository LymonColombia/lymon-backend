import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

export const GUEST_PUBLIC_KEY = 'isGuestPublic';

@Injectable()
export class GuestJwtAuthGuard extends AuthGuard('guest-jwt') {
  private readonly logger = new Logger(GuestJwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      GUEST_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any, info?: any): TUser {
    if (err || !user) {
      this.logger.warn(
        `Guest auth failed: err=${err?.message ?? err} info=${info?.message ?? info}`,
      );
      throw err || new UnauthorizedException('Invalid or missing guest token');
    }
    return user as TUser;
  }
}
