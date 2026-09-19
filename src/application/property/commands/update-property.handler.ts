import { UpdatePropertyCommand } from '@/application/property/commands/update-property.command';
import { UpdatePropertyResult } from '@/application/property/commands/update-property.result';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import { CancellationPolicy } from '@/domain/property/value-objects/cancellation-policy.vo';
import { Location } from '@/domain/property/value-objects/location.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyUpdateData } from '@/domain/property/entities/property.entity';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@CommandHandler(UpdatePropertyCommand)
export class UpdatePropertyHandler implements ICommandHandler<
  UpdatePropertyCommand,
  UpdatePropertyResult
> {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storage: R2StorageService,
  ) {}

  async execute(command: UpdatePropertyCommand): Promise<UpdatePropertyResult> {
    if (!this.hasAnyUpdatableField(command)) {
      throw new BadRequestException('At least one field is required to update');
    }

    const tenantId = TenantId.createFromString(command.tenantId);
    const propertyId = PropertyId.create(command.propertyId);

    const property = await this.propertyRepository.findById(propertyId);
    if (!property?.getTenantId().equals(tenantId)) {
      throw new NotFoundException('Property not found');
    }

    const data: PropertyUpdateData = {
      name: command.name ?? property.getName(),
      description: command.description ?? property.getDescription(),
      address: command.address ?? property.getAddress(),
      city: command.city ?? property.getCity(),
      state: command.state ?? property.getState(),
      country: command.country ?? property.getCountry(),
      zipCode: command.zipCode ?? property.getZipCode(),
      location: command.location
        ? Location.create(command.location.lat, command.location.lng)
        : property.getLocation(),
    };

    if (this.hasAnyDetailsField(command)) {
      property.updateDetails(data);
    }

    if (
      command.checkInTime !== undefined ||
      command.checkOutTime !== undefined
    ) {
      property.updateCheckInOut(
        command.checkInTime ?? property.getCheckInTime(),
        command.checkOutTime ?? property.getCheckOutTime(),
      );
    }

    if (command.cancellationPolicy !== undefined) {
      property.updateCancellationPolicy(
        CancellationPolicy.create(command.cancellationPolicy),
      );
    }

    if (command.hostPhone !== undefined || command.hostEmail !== undefined) {
      property.updateHostContact(
        command.hostPhone ?? property.getHostPhone(),
        command.hostEmail ?? property.getHostEmail(),
      );
    }

    let orphanedImageKey: string | null = null;
    if (command.imageKey !== undefined) {
      const oldKey = property.getImageKey();
      if (oldKey && oldKey !== command.imageKey) {
        orphanedImageKey = oldKey;
      }
      property.updateImageKey(command.imageKey);
    }

    const updatedPropertyId = await this.propertyRepository.save(property);

    if (orphanedImageKey) {
      await this.storage.deleteObjects([orphanedImageKey]);
    }

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.PROPERTY_UPDATED,
        AuditEntityType.PROPERTY,
        command.propertyId,
      ),
    );

    return new UpdatePropertyResult(updatedPropertyId);
  }

  private hasAnyUpdatableField(command: UpdatePropertyCommand): boolean {
    return [
      command.name,
      command.description,
      command.address,
      command.city,
      command.state,
      command.country,
      command.zipCode,
      command.location,
      command.checkInTime,
      command.checkOutTime,
      command.cancellationPolicy,
      command.hostPhone,
      command.hostEmail,
      command.imageKey,
    ].some((field) => field !== undefined);
  }

  private hasAnyDetailsField(command: UpdatePropertyCommand): boolean {
    return [
      command.name,
      command.description,
      command.address,
      command.city,
      command.state,
      command.country,
      command.zipCode,
      command.location,
    ].some((field) => field !== undefined);
  }
}
