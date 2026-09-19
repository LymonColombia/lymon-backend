import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InviteStaffCommand } from './invite-staff.command';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { Email } from '@/domain/shared/value-objects/email.vo';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '@/domain/tenant/repositories/tenant.repository';
import {
  type IPasswordHasher,
  PASSWORD_HASHER,
} from '@/application/auth/services/password-hasher.service';
import { User } from '@/domain/user/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import { RoleAssignmentValidator } from '@/application/user/services/role-assignment-validator.service';

@CommandHandler(InviteStaffCommand)
export class InviteStaffHandler implements ICommandHandler<InviteStaffCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    private readonly roleAssignmentValidator: RoleAssignmentValidator,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: InviteStaffCommand): Promise<void> {
    const tenantId = TenantId.createFromString(command.tenantId);

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!command.roleAssignments || command.roleAssignments.length === 0) {
      throw new BadRequestException('At least one role assignment is required');
    }

    const existingUser = await this.userRepository.findByEmailAndTenantId(
      Email.create(command.email),
      tenantId,
    );
    if (existingUser) {
      throw new BadRequestException('User is already a member of this tenant.');
    }

    await this.validatePlanLimits(tenantId, tenant.getPlan().getStaffLimit());
    await this.roleAssignmentValidator.validate(
      command.roleAssignments,
      tenantId.toString(),
    );

    const passwordHash = await this.passwordHasher.hash(command.password);
    const staffUser = User.createStaff(
      Email.create(command.email),
      passwordHash,
      tenantId,
      command.roleAssignments,
      command.fullName,
      command.document,
    );
    await this.userRepository.save(staffUser);

    const savedStaff = await this.userRepository.findByEmailAndTenantId(
      Email.create(command.email),
      tenantId,
    );
    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.USER_INVITED,
        AuditEntityType.USER,
        savedStaff?.getId()?.toString(),
        { invitedEmail: command.email },
      ),
    );
  }

  private async validatePlanLimits(tenantId: TenantId, staffLimit: number) {
    const existingUsers = await this.userRepository.findByTenantId(tenantId);
    const staffCount = existingUsers.filter((u) => !u.isOwner()).length;
    if (staffCount >= staffLimit) {
      throw new ForbiddenException(
        `Plan limit reached. Your current plan allows ${staffLimit} staff members. Please upgrade your plan`,
      );
    }
  }
}
