import { CreateExperienceCommand } from '@/application/experience/commands/create-experience.command';
import { CreateExperienceResult } from '@/application/experience/commands/create-experience.result';
import { Experience } from '@/domain/experience/entities/experience.entity';
import {
  EXPERIENCE_REPOSITORY,
  type ExperienceRepository,
} from '@/domain/experience/repositories/experience.repository';
import { ExperienceAvailabilityType } from '@/domain/experience/value-objects/experience-availability-type.vo';
import { ExperienceCategory } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceScope } from '@/domain/experience/value-objects/experience-scope.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
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
  ConflictException,
  HttpException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';

@CommandHandler(CreateExperienceCommand)
export class CreateExperienceHandler implements ICommandHandler<CreateExperienceCommand> {
  constructor(
    @Inject(EXPERIENCE_REPOSITORY)
    private readonly experienceRepository: ExperienceRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: CreateExperienceCommand,
  ): Promise<CreateExperienceResult> {
    const { tenantId, propertyId, experience } = this.buildDomainObjects(command);

    const property = propertyId
      ? await this.propertyRepository.findById(propertyId)
      : null;

    if (propertyId && !property) {
      throw new NotFoundException('Property not found');
    }

    if (property && !property.getTenantId().equals(tenantId)) {
      throw new NotFoundException('Property not found for current tenant');
    }

    if (propertyId) {
      const duplicatedName =
        await this.experienceRepository.existsByPropertyIdAndName(
          propertyId,
          command.name,
        );

      if (duplicatedName) {
        throw new ConflictException(
          'An experience with this name already exists for this property',
        );
      }
    }

    const experienceId = await this.experienceRepository.save(experience);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.EXPERIENCE_CREATED,
        AuditEntityType.EXPERIENCE,
        experienceId,
      ),
    );

    return new CreateExperienceResult(experienceId);
  }

  private buildDomainObjects(command: CreateExperienceCommand): {
    tenantId: TenantId;
    propertyId?: PropertyId;
    experience: Experience;
  } {
    try {
      const tenantId = TenantId.createFromString(command.tenantId);
      const scope = ExperienceScope.create(command.scope);
      const propertyId = command.propertyId
        ? PropertyId.create(command.propertyId)
        : undefined;

      const experience = Experience.create({
        tenantId,
        scope,
        propertyId,
        name: command.name,
        description: command.description,
        city: command.city,
        category: ExperienceCategory.create(command.category),
        priceCop: command.priceCop,
        minimumParticipants: command.minimumParticipants,
        capacity: command.capacity,
        availabilityType: ExperienceAvailabilityType.create(
          command.availabilityType,
        ),
        recurrence: command.recurrence,
        allowStandalonePurchase: command.allowStandalonePurchase,
        allowReservationPurchase: command.allowReservationPurchase,
        mediaKeys: command.mediaKeys,
      });

      return {
        tenantId,
        propertyId,
        experience,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
