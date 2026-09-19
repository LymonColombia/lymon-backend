import {
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateSupplierCommand } from './update-supplier.command';
import { UpdateSupplierResult } from './update-supplier.result';
import {
  SUPPLIER_REPOSITORY,
  type SupplierRepository,
} from '@/domain/inventory/repositories/supplier.repository';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { Supplier } from '@/domain/inventory/entities/supplier.entity';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import { buildAuditDiff } from '@/domain/shared/utils/audit-diff.util';

@CommandHandler(UpdateSupplierCommand)
export class UpdateSupplierHandler implements ICommandHandler<
  UpdateSupplierCommand,
  UpdateSupplierResult
> {
  constructor(
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: SupplierRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateSupplierCommand): Promise<UpdateSupplierResult> {
    this.validateAtLeastOneField(command);

    const tenantId = this.parseTenantId(command.tenantId);
    const supplierId = this.parseSupplierId(command.supplierId);

    const supplier = await this.supplierRepository.findById(supplierId);

    if (supplier?.getTenantId().equals(tenantId) !== true) {
      throw new NotFoundException('Supplier not found');
    }

    const previousSnapshot = this.getSupplierSnapshot(supplier);

    if (command.nit !== undefined) {
      const existingSupplier = await this.supplierRepository.findByNit(
        tenantId,
        command.nit,
      );

      if (
        existingSupplier &&
        existingSupplier.getId()?.toString() !== supplierId.toString()
      ) {
        throw new ConflictException('A supplier with this NIT already exists');
      }
    }

    const validatedSupplier = Supplier.create({
      tenantId: supplier.getTenantId(),
      name: command.name ?? supplier.getName(),
      contactEmail: command.contactEmail ?? supplier.getContactEmail(),
      contactPhone: command.contactPhone ?? supplier.getContactPhone(),
      country: command.country ?? supplier.getCountry(),
      city: command.city ?? supplier.getCity(),
      nit: command.nit ?? supplier.getNit(),
    });

    const updatedSupplier = Supplier.reconstitute({
      id: supplier.getId()!,
      tenantId: supplier.getTenantId(),
      name: validatedSupplier.getName(),
      contactEmail: validatedSupplier.getContactEmail(),
      contactPhone: validatedSupplier.getContactPhone(),
      country: validatedSupplier.getCountry(),
      city: validatedSupplier.getCity(),
      nit: validatedSupplier.getNit(),
      createdAt: supplier.getCreatedAt(),
      updatedAt: new Date(),
      deletedAt: supplier.getDeletedAt(),
    });

    const nextSnapshot = this.getSupplierSnapshot(updatedSupplier);
    const auditDiff = buildAuditDiff(previousSnapshot, nextSnapshot);

    await this.supplierRepository.save(updatedSupplier);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId ?? '',
        command.actorEmail ?? '',
        AuditAction.SUPPLIER_UPDATED,
        AuditEntityType.SUPPLIER,
        command.supplierId,
        auditDiff.changedFields.length > 0
          ? { changedFields: auditDiff.changedFields }
          : undefined,
        auditDiff.previousValue,
        auditDiff.newValue,
      ),
    );

    return new UpdateSupplierResult(command.supplierId);
  }

  private parseTenantId(tenantId: string): TenantId {
    try {
      return TenantId.createFromString(tenantId);
    } catch {
      throw new BadRequestException('tenantId is required');
    }
  }

  private parseSupplierId(supplierId: string): SupplierId {
    try {
      return SupplierId.create(supplierId);
    } catch {
      throw new BadRequestException('supplierId is required');
    }
  }

  private validateAtLeastOneField(command: UpdateSupplierCommand): void {
    const hasAnyFieldToUpdate =
      command.name !== undefined ||
      command.contactEmail !== undefined ||
      command.contactPhone !== undefined ||
      command.country !== undefined ||
      command.city !== undefined ||
      command.nit !== undefined;

    if (!hasAnyFieldToUpdate) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }
  }

  private getSupplierSnapshot(supplier: Supplier): Record<string, unknown> {
    return {
      name: supplier.getName(),
      contactEmail: supplier.getContactEmail(),
      contactPhone: supplier.getContactPhone(),
      country: supplier.getCountry(),
      city: supplier.getCity(),
      nit: supplier.getNit(),
    };
  }
}
