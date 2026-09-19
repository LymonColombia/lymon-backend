import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveRoleCommand } from './remove-role.command';
import { Inject, NotFoundException } from '@nestjs/common';
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

@CommandHandler(RemoveRoleCommand)
export class RemoveRoleHandler implements ICommandHandler<RemoveRoleCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RemoveRoleCommand): Promise<void> {
    const user = await this.userRepository.findById({
      toString: () => command.userId,
    } as any);
    if (!user) throw new NotFoundException('User not found');

    const before = { roleAssignments: user.getRoleAssignments() };

    const newAssignments = user.getRoleAssignments().filter((a) => {
      if (a.roleId !== command.roleId) return true;
      if (!command.scope) return false; // remove any with roleId
      return JSON.stringify(a.scope) !== JSON.stringify(command.scope);
    });

    user.updateRoleAssignments(newAssignments);
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
