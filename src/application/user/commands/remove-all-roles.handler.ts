import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveAllRolesCommand } from './remove-all-roles.command';
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

@CommandHandler(RemoveAllRolesCommand)
export class RemoveAllRolesHandler implements ICommandHandler<RemoveAllRolesCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RemoveAllRolesCommand): Promise<void> {
    const user = await this.userRepository.findById({
      toString: () => command.userId,
    } as any);
    if (!user) throw new NotFoundException('User not found');

    const before = { roleAssignments: user.getRoleAssignments() };
    user.updateRoleAssignments([]);
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
