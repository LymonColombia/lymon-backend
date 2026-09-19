import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateStaffCommand } from './update-staff.command';
import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import { RoleAssignment } from '@/domain/user/entities/user.entity';
import { UserId } from '@/domain/user/entities/user.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
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

@CommandHandler(UpdateStaffCommand)
export class UpdateStaffHandler implements ICommandHandler<UpdateStaffCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly roleAssignmentValidator: RoleAssignmentValidator,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateStaffCommand): Promise<void> {
    const userId = UserId.createFromString(command.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Ensure tenant matches if provided
    if (command.tenantId) {
      const tid = TenantId.createFromString(command.tenantId);
      if (!user.getTenantId().equals(tid)) {
        throw new BadRequestException(
          'User does not belong to the same tenant',
        );
      }
    }

    const before = {
      roleAssignments: user.getRoleAssignments(),
      fullName: user.getFullName(),
      document: user.getDocument(),
    };

    // Determine new role assignments
    let newAssignments: RoleAssignment[] = user.getRoleAssignments();

    if (command.roleAssignments && command.roleAssignments.length > 0) {
      // Full replacement after validation
      await this.roleAssignmentValidator.validate(
        command.roleAssignments,
        user.getTenantId().toString(),
      );
      newAssignments = command.roleAssignments;
    } else {
      // apply add/remove
      if (command.addPermissions && command.addPermissions.length > 0) {
        await this.roleAssignmentValidator.validate(
          command.addPermissions,
          user.getTenantId().toString(),
        );
        for (const a of command.addPermissions) {
          if (!this.includesAssignment(newAssignments, a)) {
            newAssignments = [...newAssignments, a];
          }
        }
      }

      if (command.removePermissions && command.removePermissions.length > 0) {
        for (const r of command.removePermissions) {
          newAssignments = newAssignments.filter(
            (existing) => !this.assignmentsEqual(existing, r),
          );
        }
      }
    }

    // Apply updates
    if (newAssignments) {
      user.updateRoleAssignments(newAssignments);
    }

    if (typeof command.fullName !== 'undefined') {
      // @ts-ignore - using domain method added to update fullName
      (user as any).updateFullName(command.fullName);
    }

    if (typeof command.document !== 'undefined') {
      // @ts-ignore
      (user as any).updateDocument(command.document);
    }

    await this.userRepository.save(user);

    const after = {
      roleAssignments: user.getRoleAssignments(),
      fullName: user.getFullName(),
      document: user.getDocument(),
    };

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

  private includesAssignment(
    list: RoleAssignment[],
    a: RoleAssignment,
  ): boolean {
    return list.some((l) => this.assignmentsEqual(l, a));
  }

  private assignmentsEqual(a: RoleAssignment, b: RoleAssignment): boolean {
    return (
      a.roleId === b.roleId &&
      JSON.stringify(a.scope) === JSON.stringify(b.scope)
    );
  }
}
