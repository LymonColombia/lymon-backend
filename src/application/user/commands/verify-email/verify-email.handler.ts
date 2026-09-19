import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VerifyEmailCommand } from '@/application/user/commands/verify-email/verify-email.command';
import { Inject, UnauthorizedException } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '@/domain/tenant/repositories/tenant.repository';
import {
  type ITokenService,
  TOKEN_SERVICE,
} from '@/application/auth/services/jwt.service';
import { UserId } from '@/domain/user/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  async execute(command: VerifyEmailCommand): Promise<void> {
    try {
      const payload = this.tokenService.verifyToken(command.token);

      const user = await this.userRepository.findById(
        UserId.createFromString(payload.userId),
      );

      if (!user) throw new UnauthorizedException('Invalid token');

      if (user.isEmailVerified()) return;

      user.verifyEmail();
      await this.userRepository.save(user);

      this.eventEmitter.emit(
        AUDIT_LOG_EVENT,
        new AuditLoggedEvent(
          user.getTenantId().toString(),
          user.getId()!.toString(),
          user.getEmail().toString(),
          AuditAction.USER_EMAIL_VERIFIED,
          AuditEntityType.USER,
          user.getId()!.toString(),
        ),
      );

      const tenant = await this.tenantRepository.findById(user.getTenantId());
      if (tenant && !tenant.isEmailVerified()) {
        tenant.verifyEmail();
        await this.tenantRepository.save(tenant);
      }
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
