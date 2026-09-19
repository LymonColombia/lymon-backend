import { UpdateExperienceCommand } from '@/application/experience/commands/update-experience/update-experience.command';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  EXPERIENCE_REPOSITORY,
  type ExperienceRepository,
} from '@/domain/experience/repositories/experience.repository';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';

@CommandHandler(UpdateExperienceCommand)
export class UpdateExperienceHandler implements ICommandHandler<
  UpdateExperienceCommand,
  void
> {
  constructor(
    @Inject(EXPERIENCE_REPOSITORY)
    private readonly experienceRepository: ExperienceRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(R2_STORAGE_SERVICE)
    private readonly r2StorageService: R2StorageService,
  ) {}

  async execute(command: UpdateExperienceCommand): Promise<void> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const experienceId = ExperienceId.create(command.experienceId);

    const experience = await this.experienceRepository.findById(experienceId);
    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    if (!experience.getTenantId().equals(tenantId)) {
      throw new ForbiddenException(
        'You do not have permission to edit this experience',
      );
    }

    if (command.changes.propertyId) {
      const propertyId = PropertyId.create(command.changes.propertyId);
      const property = await this.propertyRepository.findById(propertyId);

      if (!property || !property.getTenantId().equals(tenantId)) {
        throw new NotFoundException('Property not found for current tenant');
      }
    }

    const oldMediaKeys =
      command.changes.mediaKeys === undefined
        ? []
        : experience.getMediaKeys();

    try {
      experience.update(command.changes);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error) throw new BadRequestException(error.message);
      throw error;
    }

    await this.experienceRepository.save(experience);

    if (command.changes.mediaKeys !== undefined) {
      const orphaned = oldMediaKeys.filter(
        (k) => !command.changes.mediaKeys!.includes(k),
      );
      await this.r2StorageService.deleteObjects(orphaned);
    }

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actor.id,
        command.actor.email,
        AuditAction.EXPERIENCE_UPDATED,
        AuditEntityType.EXPERIENCE,
        command.experienceId,
      ),
    );
  }
}
