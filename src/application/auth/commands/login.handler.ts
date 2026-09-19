import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LoginCommand } from '@/application/auth/commands/login.command';
import {
  ForbiddenException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import {
  type UserRepository,
  USER_REPOSITORY,
} from '@/domain/user/repositories/user.repository';
import {
  type TenantRepository,
  TENANT_REPOSITORY,
} from '@/domain/tenant/repositories/tenant.repository';
import {
  type IPasswordHasher,
  PASSWORD_HASHER,
} from '@/application/auth/services/password-hasher.service';
import {
  type ITokenService,
  JwtPayload,
  ResolvedRoleAssignment,
  TOKEN_SERVICE,
} from '@/application/auth/services/jwt.service';
import {
  type RoleRepository,
  ROLE_REPOSITORY,
} from '@/domain/role/repositories/role.repository';
import { RoleId } from '@/domain/role/entities/role.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

export class LoginResult {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly tenantId: string,
    public readonly isOwner: boolean,
    public readonly emailVerified: boolean,
    public readonly accessToken: string,
    public readonly refreshToken: string,
    public readonly tutorialCompleted: boolean,
    public readonly trialWarning: {
      daysRemaining: number;
      message: string;
    } | null,
  ) {}
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = Email.create(command.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const isPasswordValid = await this.passwordHasher.compare(
      command.password,
      user.getPasswordHash(),
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tenant = await this.tenantRepository.findById(user.getTenantId());
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    if (tenant.isTrialExpired()) {
      throw new ForbiddenException(
        'Your free trial ended. Upgrade your plan to continue.',
      );
    }

    // Resolve role permissions for staff users
    const resolvedAssignments: ResolvedRoleAssignment[] = [];
    for (const assignment of user.getRoleAssignments()) {
      const role = await this.roleRepository.findById(
        RoleId.createFromString(assignment.roleId),
      );
      if (role) {
        resolvedAssignments.push({
          roleId: role.getId()!.toString(),
          roleName: role.getName(),
          permissions: role.getPermissions(),
          scope: assignment.scope,
        });
      }
    }

    const payload: JwtPayload = {
      userId: user.getId()!.toString(),
      email: user.getEmail().toString(),
      tenantId: user.getTenantId().toString(),
      activePlan: tenant.getPlan().toString(),
      isOwner: user.isOwner(),
      emailVerified: user.isEmailVerified(),
      roleAssignments: resolvedAssignments,
      trialEndsAt: tenant.getTrialEndsAt()?.toISOString() ?? null,
    };

    const accessToken = this.tokenService.generateAccesToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(payload);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        user.getTenantId().toString(),
        user.getId()!.toString(),
        user.getEmail().toString(),
        AuditAction.AUTH_LOGIN,
        AuditEntityType.AUTH,
        user.getId()!.toString(),
      ),
    );

    const daysRemaining = tenant.getTrialDaysRemaining();
    const trialWarning =
      daysRemaining !== null && daysRemaining <= 2
        ? {
            daysRemaining,
            message: `Your free trial ends in ${daysRemaining} day(s). Upgrade your plan.`,
          }
        : null;

    return new LoginResult(
      user.getId()!.toString(),
      user.getEmail().toString(),
      user.getTenantId().toString(),
      user.isOwner(),
      user.isEmailVerified(),
      accessToken,
      refreshToken,
      user.getTutorialCompleted(),
      trialWarning,
    );
  }
}
