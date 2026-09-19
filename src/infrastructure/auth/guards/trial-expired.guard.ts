import { JwtPayload } from '@/application/auth/services/jwt.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class TrialExpiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;

    if (
      user?.trialEndsAt &&
      new Date(user.trialEndsAt).getTime() < Date.now()
    ) {
      throw new ForbiddenException(
        'Your free trial ended. Upgrade your plan to continue.',
      );
    }

    return true;
  }
}
