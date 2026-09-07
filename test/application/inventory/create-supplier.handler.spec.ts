import { ConflictException } from '@nestjs/common';
import { CreateSupplierHandler } from '@/application/inventory/commands/create-supplier/create-supplier.handler';
import { CreateSupplierCommand } from '@/application/inventory/commands/create-supplier/create-supplier.command';
import { CreateSupplierResult } from '@/application/inventory/commands/create-supplier/create-supplier.result';
import { SupplierRepository } from '@/domain/inventory/repositories/supplier.repository';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { createSupplierRepositoryMock } from '@test/shared/mocks/repositories/supplier-repository.mock';
import { makeSupplier } from '@test/shared/fixtures/supplier.fixture';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

describe('CreateSupplierHandler', () => {
  let handler: CreateSupplierHandler;
  let supplierRepository: jest.Mocked<SupplierRepository>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  beforeEach(() => {
    supplierRepository = createSupplierRepositoryMock();
    eventEmitter = {
      emit: jest.fn(),
    };
    handler = new CreateSupplierHandler(
      supplierRepository,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('when a supplier with the same NIT already exists', () => {
    it('throws ConflictException', async () => {
      supplierRepository.findByNit.mockResolvedValue(makeSupplier());

      const command = new CreateSupplierCommand(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        'Fresh Supplies Inc.',
        'contact@freshsupplies.com',
        '+12025550123',
        'Colombia',
        'Bogotá',
        'NIT-123456789',
        'admin-user-id',
        'admin@example.com',
      );

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow(
        'A supplier with this NIT already exists',
      );

      expect(supplierRepository.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('when required fields are missing', () => {
    it('throws DomainException for missing supplier name', async () => {
      supplierRepository.findByNit.mockResolvedValue(null);

      const command = new CreateSupplierCommand(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        '   ',
        'contact@freshsupplies.com',
        '+12025550123',
        'Colombia',
        'Bogotá',
        'NIT-123456789',
        'admin-user-id',
        'admin@example.com',
      );

      await expect(handler.execute(command)).rejects.toThrow(DomainException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Supplier name is required',
      );
    });
  });

  describe('when contact email is malformed', () => {
    it('throws DomainException', async () => {
      supplierRepository.findByNit.mockResolvedValue(null);

      const command = new CreateSupplierCommand(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        'Fresh Supplies Inc.',
        'invalid-email',
        '+12025550123',
        'Colombia',
        'Bogotá',
        'NIT-123456789',
        'admin-user-id',
        'admin@example.com',
      );

      await expect(handler.execute(command)).rejects.toThrow(DomainException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Supplier contact email format is invalid',
      );
    });
  });

  describe('when supplier data is valid and NIT is unique', () => {
    it('creates supplier, saves it, and returns result', async () => {
      supplierRepository.findByNit.mockResolvedValue(null);
      supplierRepository.save.mockResolvedValue('new-supplier-id');

      const command = new CreateSupplierCommand(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        'Fresh Supplies Inc.',
        'CONTACT@freshsupplies.com',
        '+12025550123',
        'Colombia',
        'Bogotá',
        'nit-123456789',
        'admin-user-id',
        'admin@example.com',
      );

      const result = await handler.execute(command);

      expect(result).toBeInstanceOf(CreateSupplierResult);
      expect(result.supplierId).toBe('new-supplier-id');

      expect(supplierRepository.findByNit).toHaveBeenCalledTimes(1);
      expect(supplierRepository.findByNit.mock.calls[0][0].toString()).toBe(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      );
      expect(supplierRepository.findByNit).toHaveBeenCalledWith(
        expect.any(TenantId),
        'nit-123456789',
      );

      expect(supplierRepository.save).toHaveBeenCalledTimes(1);
      const savedSupplier = supplierRepository.save.mock.calls[0][0];
      expect(savedSupplier.getTenantId().toString()).toBe(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      );
      expect(savedSupplier.getName()).toBe('Fresh Supplies Inc.');
      expect(savedSupplier.getContactEmail()).toBe('contact@freshsupplies.com');
      expect(savedSupplier.getContactPhone()).toBe('+12025550123');
      expect(savedSupplier.getCountry()).toBe('Colombia');
      expect(savedSupplier.getCity()).toBe('Bogotá');
      expect(savedSupplier.getNit()).toBe('NIT-123456789');

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      const [eventName, eventPayload] = eventEmitter.emit.mock.calls[0];
      expect(eventName).toBe(AUDIT_LOG_EVENT);
      expect(eventPayload).toBeInstanceOf(AuditLoggedEvent);
      expect((eventPayload as AuditLoggedEvent).action).toBe(
        AuditAction.SUPPLIER_CREATED,
      );
      expect((eventPayload as AuditLoggedEvent).entityType).toBe(
        AuditEntityType.SUPPLIER,
      );
      expect((eventPayload as AuditLoggedEvent).entityId).toBe(
        'new-supplier-id',
      );
    });
  });
});
