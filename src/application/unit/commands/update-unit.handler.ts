import { UpdateUnitCommand } from '@/application/unit/commands/update-unit.command';
import { UpdateUnitResult } from '@/application/unit/commands/update-unit.result';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import { Unit } from '@/domain/unit/entities/unit.entity';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import { BedTypeEnum } from '@/domain/unit/value-objects/bed-type.vo';
import {
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import { InventoryCountValidator } from '@/domain/reservation/services/inventory-count-validator.domain-service';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@CommandHandler(UpdateUnitCommand)
export class UpdateUnitHandler implements ICommandHandler<UpdateUnitCommand> {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(R2_STORAGE_SERVICE)
    private readonly r2StorageService: R2StorageService,
  ) {}

  async execute(command: UpdateUnitCommand): Promise<UpdateUnitResult> {
    this.validateAtLeastOneField(command);

    const unit = await this.unitRepository.findById(
      UnitId.create(command.unitId),
    );

    if (!unit || unit?.getTenantId().toString() !== command.tenantId) {
      throw new NotFoundException('Unit not found');
    }

    const previousInventoryCount = unit.getInventoryCount();

    if (command.inventoryCount !== undefined) {
      await this.validateAndApplyInventoryCount(
        command.inventoryCount,
        command.unitId,
        unit,
      );
    }

    const oldMediaKeys = this.applyFieldUpdates(unit, command);

    await this.unitRepository.save(unit);

    if (command.mediaKeys !== undefined) {
      const orphaned = oldMediaKeys.filter(
        (k) => !command.mediaKeys!.includes(k),
      );
      await this.r2StorageService.deleteObjects(orphaned);
    }

    if (command.actorId && command.actorEmail) {
      this.eventEmitter.emit(
        AUDIT_LOG_EVENT,
        new AuditLoggedEvent(
          command.tenantId,
          command.actorId,
          command.actorEmail,
          AuditAction.UNIT_UPDATED,
          AuditEntityType.UNIT,
          command.unitId,
          {
            changedFields: this.getChangedFields(command),
            ...(command.inventoryCount === undefined
              ? {}
              : {
                  inventoryCount: {
                    before: previousInventoryCount,
                    after: command.inventoryCount,
                  },
                }),
          },
        ),
      );
    }

    return new UpdateUnitResult(command.unitId);
  }

  private applyFieldUpdates(unit: Unit, command: UpdateUnitCommand): string[] {
    if (command.name !== undefined || command.description !== undefined) {
      unit.updateDetails(
        command.name ?? unit.getName(),
        command.description ?? unit.getDescription(),
      );
    }

    if (command.maxGuests !== undefined || command.standardGuests !== undefined) {
      unit.updateCapacity(
        command.maxGuests ?? unit.getMaxGuests(),
        command.standardGuests ?? unit.getStandardGuests(),
      );
    }

    if (command.bedrooms !== undefined) {
      unit.updateBedrooms(
        command.bedrooms.map((bedroom) => ({
          roomName: bedroom.roomName,
          beds: bedroom.beds.map((bed) => ({
            type: bed.type as BedTypeEnum,
            count: bed.count,
          })),
        })),
      );
    }

    if (command.bathroomsCount !== undefined) unit.updateBathroomsCount(command.bathroomsCount);
    if (command.isShared !== undefined) unit.updateShared(command.isShared);
    if (command.amenities !== undefined) unit.updateAmenities(command.amenities);

    const oldMediaKeys = command.mediaKeys === undefined ? [] : unit.getMediaKeys();
    if (command.mediaKeys !== undefined) unit.updateMediaKeys(command.mediaKeys);

    if (command.pricePerNight !== undefined) unit.updatePrice(command.pricePerNight);

    if (command.externalIds !== undefined) {
      unit.updateExternalIds(
        ExternalIds.create(
          command.externalIds.airbnbId,
          command.externalIds.bookingId,
          command.externalIds.vrboId,
        ),
      );
    }

    return oldMediaKeys;
  }

  private async validateAndApplyInventoryCount(
    inventoryCount: number,
    unitId: string,
    unit: Unit,
  ): Promise<void> {
    if (inventoryCount >= unit.getInventoryCount()) return;

    const activeReservations =
      await this.reservationRepository.findActiveByUnitFromDate(
        UnitId.create(unitId),
        new Date(),
      );

    const minimumAllowedInventory =
      InventoryCountValidator.getMinimumRequiredInventory(activeReservations);

    if (inventoryCount < minimumAllowedInventory) {
      throw new ConflictException(
        `Cannot reduce inventory count below ${minimumAllowedInventory} because there are active reservations in overlapping dates`,
      );
    }

    unit.updateInventoryCount(inventoryCount);
  }

  private validateAtLeastOneField(command: UpdateUnitCommand): void {
    const hasAnyFieldToUpdate =
      command.name !== undefined ||
      command.description !== undefined ||
      command.inventoryCount !== undefined ||
      command.maxGuests !== undefined ||
      command.standardGuests !== undefined ||
      command.bedrooms !== undefined ||
      command.bathroomsCount !== undefined ||
      command.isShared !== undefined ||
      command.amenities !== undefined ||
      command.mediaKeys !== undefined ||
      command.pricePerNight !== undefined ||
      command.externalIds !== undefined;

    if (!hasAnyFieldToUpdate) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }
  }

  private getChangedFields(command: UpdateUnitCommand): string[] {
    const changedFields: string[] = [];

    if (command.name !== undefined) changedFields.push('name');
    if (command.description !== undefined) changedFields.push('description');
    if (command.inventoryCount !== undefined)
      changedFields.push('inventoryCount');
    if (command.maxGuests !== undefined) changedFields.push('maxGuests');
    if (command.standardGuests !== undefined)
      changedFields.push('standardGuests');
    if (command.bedrooms !== undefined) changedFields.push('bedrooms');
    if (command.bathroomsCount !== undefined)
      changedFields.push('bathroomsCount');
    if (command.isShared !== undefined) changedFields.push('isShared');
    if (command.amenities !== undefined) changedFields.push('amenities');
    if (command.mediaKeys !== undefined) changedFields.push('mediaKeys');
    if (command.pricePerNight !== undefined)
      changedFields.push('pricePerNight');
    if (command.externalIds !== undefined) changedFields.push('externalIds');

    return changedFields;
  }
}
