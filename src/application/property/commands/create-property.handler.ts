import { CreatePropertyCommand } from '@/application/property/commands/create-property.command';
import { CreatePropertyResult } from '@/application/property/commands/create-property.result';
import { Property } from '@/domain/property/entities/property.entity';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import { CancellationPolicy } from '@/domain/property/value-objects/cancellation-policy.vo';
import { Location } from '@/domain/property/value-objects/location.vo';
import { PropertyType } from '@/domain/property/value-objects/property-type.vo';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '@/domain/tenant/repositories/tenant.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { Unit } from '@/domain/unit/entities/unit.entity';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@/domain/shared/transaction-manager.interface';
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

@CommandHandler(CreatePropertyCommand)
export class CreatePropertyHandler implements ICommandHandler<CreatePropertyCommand> {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactionManager: TransactionManager,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreatePropertyCommand): Promise<CreatePropertyResult> {
    const tenantId = TenantId.createFromString(command.tenantId);

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    await this.validatePlanLimits(tenantId, tenant.getPlan().getSiteLimit());

    const propertyType = PropertyType.create(command.propertyType);
    const property = Property.create({
      tenantId: tenantId,
      name: command.name,
      description: command.description,
      propertyType: propertyType,
      address: command.address,
      city: command.city,
      state: command.state,
      country: command.country,
      zipCode: command.zipCode,
      location: Location.create(command.location.lat, command.location.lng),
      checkInTime: command.checkInTime,
      checkOutTime: command.checkOutTime,
      cancellationPolicy: CancellationPolicy.create(command.cancellationPolicy),
      hostPhone: command.hostPhone,
      hostEmail: command.hostEmail,
      imageKey: command.imageKey,
    });

    const shouldAutoCreate =
      command.autoCreateUnit && propertyType.shouldAutoCreateUnit();

    if (!shouldAutoCreate) {
      const propertyId = await this.propertyRepository.save(property);
      this.eventEmitter.emit(
        AUDIT_LOG_EVENT,
        new AuditLoggedEvent(
          command.tenantId,
          command.actorId,
          command.actorEmail,
          AuditAction.PROPERTY_CREATED,
          AuditEntityType.PROPERTY,
          propertyId,
        ),
      );
      return new CreatePropertyResult(propertyId);
    }

    const result = await this.transactionManager.executeInTransaction(
      async (context) => {
        const propertyIdString = await this.propertyRepository.save(
          property,
          context.getContext(),
        );
        const propertyId = PropertyId.create(propertyIdString);

        const unit = Unit.create({
          tenantId,
          propertyId,
          basicInfo: {
            name: command.name,
            description: command.description,
          },
          inventoryConfig: {
            inventoryCount: 1,
          },
          capacityConfig: {
            maxGuests: 4,
            standardGuests: 2,
          },
          physicalFeatures: {
            bedrooms: [],
            bathroomsCount: 1,
            isShared: false,
          },
          pricingConfig: {
            pricePerNight: 0,
          },
          amenities: [],
          externalIds: ExternalIds.create(),
        });

        const unitIdString = await this.unitRepository.save(
          unit,
          context.getContext(),
        );

        return new CreatePropertyResult(propertyIdString, unitIdString);
      },
    );

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.PROPERTY_CREATED,
        AuditEntityType.PROPERTY,
        result.propertyId,
      ),
    );
    if (result.unitId) {
      this.eventEmitter.emit(
        AUDIT_LOG_EVENT,
        new AuditLoggedEvent(
          command.tenantId,
          command.actorId,
          command.actorEmail,
          AuditAction.UNIT_CREATED,
          AuditEntityType.UNIT,
          result.unitId,
        ),
      );
    }
    return result;
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
