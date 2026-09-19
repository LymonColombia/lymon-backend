import { DeleteExperienceCommand } from '@/application/experience/commands/delete-experience.command';
import {
  EXPERIENCE_REPOSITORY,
  type ExperienceRepository,
} from '@/domain/experience/repositories/experience.repository';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';

@CommandHandler(DeleteExperienceCommand)
export class DeleteExperienceHandler implements ICommandHandler<
  DeleteExperienceCommand,
  void
> {
  constructor(
    @Inject(EXPERIENCE_REPOSITORY)
    private readonly experienceRepository: ExperienceRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeleteExperienceCommand): Promise<void> {
    const experienceId = ExperienceId.create(command.experienceId);
    const experience = await this.experienceRepository.findById(experienceId);

    if (experience?.getTenantId().toString() !== command.tenantId) {
      throw new NotFoundException(
        `Experience with id "${command.experienceId}" not found`,
      );
    }

    await this.experienceRepository.delete(experienceId);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.EXPERIENCE_DELETED,
        AuditEntityType.EXPERIENCE,
        command.experienceId,
      ),
    );
  }
}
