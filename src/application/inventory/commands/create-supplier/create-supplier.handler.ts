import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateSupplierCommand } from './create-supplier.command';
import { CreateSupplierResult } from './create-supplier.result';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  SUPPLIER_REPOSITORY,
  type SupplierRepository,
} from '@/domain/inventory/repositories/supplier.repository';
import { Supplier } from '@/domain/inventory/entities/supplier.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

@CommandHandler(CreateSupplierCommand)
export class CreateSupplierHandler implements ICommandHandler<
  CreateSupplierCommand,
  CreateSupplierResult
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateSupplierCommand): Promise<CreateSupplierResult> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const existingSupplier = await this.supplierRepository.findByNit(
      tenantId,
      command.nit,
    );

    if (existingSupplier) {
      throw new ConflictException('A supplier with this NIT already exists');
    }

    const supplier = Supplier.create({
      tenantId,
      name: command.name,
      contactEmail: command.contactEmail,
      contactPhone: command.contactPhone,
      country: command.country,
      city: command.city,
      nit: command.nit,
    });

    const supplierId = await this.supplierRepository.save(supplier);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.SUPPLIER_CREATED,
        AuditEntityType.SUPPLIER,
        supplierId,
      ),
    );

    return new CreateSupplierResult(supplierId);
  }
}
