import { CreateUnitCommand } from '@/application/unit/commands/create-unit.command';
import { CreateUnitResult } from '@/application/unit/commands/create-unit.result';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '@/domain/tenant/repositories/tenant.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { Unit } from '@/domain/unit/entities/unit.entity';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import { BedTypeEnum } from '@/domain/unit/value-objects/bed-type.vo';
import { ForbiddenException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

@CommandHandler(CreateUnitCommand)
export class CreateUnitHandler implements ICommandHandler<CreateUnitCommand> {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateUnitCommand): Promise<CreateUnitResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const propertyId = PropertyId.create(command.propertyId);

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const property = await this.propertyRepository.findById(propertyId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (!property.getTenantId().equals(tenantId)) {
      throw new ForbiddenException('Property does not belong to this tenant');
    }

    await this.validatePlanLimits(tenantId, tenant.getPlan().getSiteLimit());

    const bedrooms = command.bedrooms.map((bedroom) => ({
      roomName: bedroom.roomName,
      beds: bedroom.beds.map((bed) => ({
        type: bed.type as BedTypeEnum,
        count: bed.count,
      })),
    }));

    const unit = Unit.create({
      tenantId,
      propertyId,
      basicInfo: {
        name: command.name,
        description: command.description,
      },
      inventoryConfig: {
        inventoryCount: command.inventoryCount,
      },
      capacityConfig: {
        maxGuests: command.maxGuests,
        standardGuests: command.standardGuests,
      },
      physicalFeatures: {
        bedrooms,
        bathroomsCount: command.bathroomsCount,
        isShared: command.isShared,
      },
      pricingConfig: {
        pricePerNight: command.pricePerNight,
      },
      amenities: command.amenities,
      externalIds: ExternalIds.create(
        command.externalIds?.airbnbId,
        command.externalIds?.bookingId,
        command.externalIds?.vrboId,
      ),
      mediaKeys: command.mediaKeys,
    });

    const unitId = await this.unitRepository.save(unit);

    if (command.actorId && command.actorEmail) {
      this.eventEmitter.emit(
        AUDIT_LOG_EVENT,
        new AuditLoggedEvent(
          command.tenantId,
          command.actorId,
          command.actorEmail,
          AuditAction.UNIT_CREATED,
          AuditEntityType.UNIT,
          unitId,
        ),
      );
    }

    return new CreateUnitResult(unitId);
  }

  private async validatePlanLimits(
    tenantId: TenantId,
    siteLimit: number,
  ): Promise<void> {
    const propertyCount =
      await this.propertyRepository.countByTenantId(tenantId);
    const unitCount = await this.unitRepository.countByTenantId(tenantId);
    const totalSites = propertyCount + unitCount;

    if (totalSites >= siteLimit) {
      throw new ForbiddenException(
        `Plan limit reached. Your current plan allows ${siteLimit} sites (properties + units). Please upgrade your plan.`,
      );
    }
  }
}
