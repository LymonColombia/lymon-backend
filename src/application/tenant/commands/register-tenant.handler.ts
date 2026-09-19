import {
  type ITokenService,
  JwtPayload,
  TOKEN_SERVICE,
} from '@/application/auth/services/jwt.service';
import {
  type IPasswordHasher,
  PASSWORD_HASHER,
} from '@/application/auth/services/password-hasher.service';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '@/application/shared/services/email.service';
import { RegisterTenantCommand } from '@/application/tenant/commands/register-tenant.command';
import { Tenant } from '@/domain/tenant/entities/tenant.entity';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '@/domain/tenant/repositories/tenant.repository';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { PlanType } from '@/domain/tenant/value-objects/plan-type.vo';
import { User } from '@/domain/user/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { ConflictException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  TENANT_REGISTERED_EVENT,
  TenantRegisteredEvent,
} from '@/application/tenant/events/tenant-registered.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

export class RegisterTenantResult {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {}
}

@CommandHandler(RegisterTenantCommand)
export class RegisterTenantHandler implements ICommandHandler<RegisterTenantCommand> {
  private readonly logger = new Logger(RegisterTenantHandler.name);

  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RegisterTenantCommand): Promise<RegisterTenantResult> {
    const email = Email.create(command.email);

    const existingTenant = await this.tenantRepository.exists(email);
    if (existingTenant) {
      throw new ConflictException('A tenant with this email already exists');
    }

    const plan = PlanType.create(command.planType);
    const tenant = Tenant.create(command.tenantName, email, plan);
    await this.tenantRepository.save(tenant);

    const savedTenant = await this.tenantRepository.findByOwnerEmail(email);
    if (!savedTenant) throw new Error('Failed to create a tenant');

    const passwordHash = await this.passwordHasher.hash(command.password);

    const user = User.createOwner(email, passwordHash, savedTenant.getId()!); // Afirmo que siempre habrá un valor para este punto pq si lo guardo exitosamente tien
    await this.userRepository.save(user);

    const savedUser = await this.userRepository.findByEmail(email);
    if (!savedUser) throw new Error('Failed to create user');

    const payload: JwtPayload = {
      userId: savedUser.getId()!.toString(),
      email: savedUser.getEmail().toString(),
      tenantId: savedUser.getTenantId().toString(),
      activePlan: savedTenant.getPlan().toString(),
      isOwner: savedUser.isOwner(),
      emailVerified: savedUser.isEmailVerified(),
      roleAssignments: [],
      trialEndsAt: savedTenant.getTrialEndsAt()?.toISOString() ?? null,
    };

    const accessToken = this.tokenService.generateAccesToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(payload);

    const verificationPayload: JwtPayload = {
      userId: savedUser.getId()!.toString(),
      email: savedUser.getEmail().toString(),
      tenantId: savedUser.getTenantId().toString(),
      activePlan: savedTenant.getPlan().toString(),
      isOwner: savedUser.isOwner(),
      emailVerified: false,
      roleAssignments: [],
      trialEndsAt: savedTenant.getTrialEndsAt()?.toISOString() ?? null,
    };

    const verificationToken =
      this.tokenService.generateAccesToken(verificationPayload);

    // ponytail: tenant y user ya están persistidos; si el envío falla no se
    // revierte el registro, el usuario reenvía la verificación desde la app.
    try {
      await this.emailService.sendVerificationEmail(
        email.toString(),
        verificationToken,
      );
    } catch (error: unknown) {
      this.logger.error(
        `No se pudo enviar el email de verificación a ${email.toString()}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    this.eventEmitter.emit(
      TENANT_REGISTERED_EVENT,
      new TenantRegisteredEvent(savedTenant.getId()!.toString()),
    );

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        savedTenant.getId()!.toString(),
        savedUser.getId()!.toString(),
        email.toString(),
        AuditAction.TENANT_REGISTERED,
        AuditEntityType.TENANT,
        savedTenant.getId()!.toString(),
      ),
    );

    return new RegisterTenantResult(
      savedTenant.getId()!.toString(),
      savedUser.getId()!.toString(),
      email.toString(),
      accessToken,
      refreshToken,
    );
  }
}
