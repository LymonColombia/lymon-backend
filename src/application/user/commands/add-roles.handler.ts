import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddRolesCommand } from './add-roles.command';
import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import { RoleAssignmentValidator } from '@/application/user/services/role-assignment-validator.service';

@CommandHandler(AddRolesCommand)
export class AddRolesHandler implements ICommandHandler<AddRolesCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly roleAssignmentValidator: RoleAssignmentValidator,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: AddRolesCommand): Promise<void> {
    const user = await this.userRepository.findById({
      toString: () => command.userId,
    } as any);
    if (!user) throw new NotFoundException('User not found');

    if (!command.roleAssignments || command.roleAssignments.length === 0) {
      throw new BadRequestException('roleAssignments required');
    }

    await this.roleAssignmentValidator.validate(
      command.roleAssignments,
      user.getTenantId().toString(),
    );

    const before = { roleAssignments: user.getRoleAssignments() };

    const existing = user.getRoleAssignments();
    for (const a of command.roleAssignments) {
      const exists = existing.some(
        (e) =>
          e.roleId === a.roleId &&
          JSON.stringify(e.scope) === JSON.stringify(a.scope),
      );
      if (!exists) existing.push(a);
    }

    user.updateRoleAssignments(existing);
    await this.userRepository.save(user);

    const after = { roleAssignments: user.getRoleAssignments() };

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId ?? user.getTenantId().toString(),
        command.actorId ?? '',
        command.actorEmail ?? '',
        AuditAction.USER_UPDATED,
        AuditEntityType.USER,
        user.getId()?.toString(),
        { before, after },
      ),
    );
  }

}
