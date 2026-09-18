import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SuppliersController } from '@/presentation/controllers/suppliers.controller';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { DeleteSupplierCommand } from '@/application/inventory/commands/delete-supplier/delete-supplier.command';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  const user = {
    userId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
    email: 'admin@test.com',
    tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
    roleAssignments: [
      {
        roleId: 'r1',
        roleName: 'ADMIN',
        permissions: [Permission.PROPERTY_EDIT],
        scope: 'SYSTEM',
      },
    ],
  } as any;

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    controller = new SuppliersController(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  it('gets suppliers list with pagination', async () => {
    queryBus.execute.mockResolvedValue({
      suppliers: [
        {
          supplierId: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
          name: 'Fresh Supplies Inc.',
          contactEmail: 'contact@freshsupplies.com',
          contactPhone: '+12025550123',
          country: 'Colombia',
          city: 'Bogota',
          nit: 'NIT-123456789',
          status: 'ACTIVE',
          createdAt: '2026-04-10T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const result = await controller.getSuppliers(
      user,
      1,
      10,
      'fresh',
      'name',
      'asc',
    );

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: 'Suppliers retrieved successfully',
      data: [
        {
          supplierId: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
          name: 'Fresh Supplies Inc.',
          contactEmail: 'contact@freshsupplies.com',
          contactPhone: '+12025550123',
          country: 'Colombia',
          city: 'Bogota',
          nit: 'NIT-123456789',
          status: 'ACTIVE',
          createdAt: '2026-04-10T10:00:00.000Z',
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });
  });

  it('uses default pagination when page and limit are omitted', async () => {
    queryBus.execute.mockResolvedValue({
      suppliers: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    const result = await controller.getSuppliers(user);

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.page).toBe(1);
  });

  it('creates a supplier and returns supplier id', async () => {
    commandBus.execute.mockResolvedValue({
      supplierId: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
    });

    const result = await controller.createSupplier(user, {
      name: 'Fresh Supplies Inc.',
      contactEmail: 'contact@freshsupplies.com',
      contactPhone: '+12025550123',
      country: 'Colombia',
      city: 'Bogotá',
      nit: 'NIT-123456789',
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: 'Supplier created successfully',
      data: { supplierId: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000' },
    });
  });

  it('dispatches DeleteSupplierCommand for supplier delete', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.deleteSupplier(user, '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000');

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(DeleteSupplierCommand),
    );
  });
});
