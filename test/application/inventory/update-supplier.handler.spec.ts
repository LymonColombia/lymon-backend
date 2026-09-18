import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSupplierHandler } from '@/application/inventory/commands/update-supplier/update-supplier.handler';
import { UpdateSupplierCommand } from '@/application/inventory/commands/update-supplier/update-supplier.command';
import { UpdateSupplierResult } from '@/application/inventory/commands/update-supplier/update-supplier.result';
import { SupplierRepository } from '@/domain/inventory/repositories/supplier.repository';
import { createSupplierRepositoryMock } from '@test/shared/mocks/repositories/supplier-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { makeSupplier } from '@test/shared/fixtures/supplier.fixture';

describe('UpdateSupplierHandler', () => {
  let handler: UpdateSupplierHandler;
  let supplierRepository: jest.Mocked<SupplierRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    supplierRepository = createSupplierRepositoryMock();
    eventEmitter = createEventEmitterMock();
    handler = new UpdateSupplierHandler(
      supplierRepository,
      eventEmitter as any,
    );
  });

  it('throws NotFoundException when the supplier does not exist', async () => {
    supplierRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new UpdateSupplierCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
          'Updated Supplier',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'admin-user-id',
          'admin@example.com',
        ),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when the NIT belongs to another supplier', async () => {
    supplierRepository.findById.mockResolvedValue(
      makeSupplier({ id: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000' }),
    );
    supplierRepository.findByNit.mockResolvedValue(
      makeSupplier({ id: 'supplier-456', nit: 'NIT-999999999' }),
    );

    await expect(
      handler.execute(
        new UpdateSupplierCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'NIT-999999999',
          'admin-user-id',
          'admin@example.com',
        ),
      ),
    ).rejects.toThrow(ConflictException);

    expect(supplierRepository.save).not.toHaveBeenCalled();
  });

  it('updates the supplier and returns the supplier id', async () => {
    supplierRepository.findById.mockResolvedValue(
      makeSupplier({ id: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000' }),
    );
    supplierRepository.findByNit.mockResolvedValue(null);
    supplierRepository.save.mockResolvedValue('65f1a1a2-b3c4-d5e6-f7a8-b9c400000000');

    const result = await handler.execute(
      new UpdateSupplierCommand(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
        '  Updated Supplies Ltd.  ',
        'UPDATED@SUPPLIES.COM',
        '+12025550999',
        'Chile',
        'Santiago',
        'nit-999999999',
        'admin-user-id',
        'admin@example.com',
      ),
    );

    expect(result).toBeInstanceOf(UpdateSupplierResult);
    expect(result.supplierId).toBe('65f1a1a2-b3c4-d5e6-f7a8-b9c400000000');
    expect(supplierRepository.save).toHaveBeenCalledTimes(1);

    const savedSupplier = supplierRepository.save.mock.calls[0][0];
    expect(savedSupplier.getTenantId().toString()).toBe(
      '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
    );
    expect(savedSupplier.getName()).toBe('Updated Supplies Ltd.');
    expect(savedSupplier.getContactEmail()).toBe('updated@supplies.com');
    expect(savedSupplier.getContactPhone()).toBe('+12025550999');
    expect(savedSupplier.getCountry()).toBe('Chile');
    expect(savedSupplier.getCity()).toBe('Santiago');
    expect(savedSupplier.getNit()).toBe('NIT-999999999');
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        entityType: 'SUPPLIER',
        metadata: {
          changedFields: [
            'name',
            'contactEmail',
            'contactPhone',
            'country',
            'city',
            'nit',
          ],
        },
        previousValue: {
          name: 'Fresh Supplies Inc.',
          contactEmail: 'contact@freshsupplies.com',
          contactPhone: '+12025550123',
          country: 'Colombia',
          city: 'Bogotá',
          nit: 'NIT-123456789',
        },
        newValue: {
          name: 'Updated Supplies Ltd.',
          contactEmail: 'updated@supplies.com',
          contactPhone: '+12025550999',
          country: 'Chile',
          city: 'Santiago',
          nit: 'NIT-999999999',
        },
      }),
    );
  });

  it('throws BadRequestException when no field is provided', async () => {
    supplierRepository.findById.mockResolvedValue(
      makeSupplier({ id: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000' }),
    );

    await expect(
      handler.execute(
        new UpdateSupplierCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'admin-user-id',
          'admin@example.com',
        ),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when tenantId or supplierId is empty', async () => {
    await expect(
      handler.execute(
        new UpdateSupplierCommand(
          '',
          '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
          'Updated Supplier',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'admin-user-id',
          'admin@example.com',
        ),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      handler.execute(
        new UpdateSupplierCommand(
          '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
          '',
          'Updated Supplier',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'admin-user-id',
          'admin@example.com',
        ),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(supplierRepository.findById).not.toHaveBeenCalled();
    expect(supplierRepository.findByNit).not.toHaveBeenCalled();
    expect(supplierRepository.save).not.toHaveBeenCalled();
  });
});
