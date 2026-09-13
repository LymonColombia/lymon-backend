import { PrismaSupplierRepository } from '@/infrastructure/persistence/repositories/prisma-supplier.repository';
import { PrismaTransactionManager } from '@/infrastructure/persistence/transaction/prisma-transaction-manager';
import { Supplier } from '@/domain/inventory/entities/supplier.entity';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedTenant } from './fixtures';

describe('PrismaSupplierRepository', () => {
  const repo = new PrismaSupplierRepository(prisma);

  let tenantId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newSupplier = (name = 'Aseo Total', nit = 'NIT-900123') =>
    Supplier.create({
      tenantId: TenantId.createFromString(tenantId),
      name,
      contactEmail: 'ventas@aseo.com',
      contactPhone: '+573001112233',
      country: 'CO',
      city: 'Bogota',
      nit,
    });

  it('round-trips and finds by NIT, upper-casing the lookup', async () => {
    const id = await repo.save(newSupplier());

    const found = (await repo.findById(SupplierId.create(id)))!;
    expect(found.getName()).toBe('Aseo Total');
    expect(found.getCity()).toBe('Bogota');

    const tenant = TenantId.createFromString(tenantId);
    expect(await repo.findByNit(tenant, ' nit-900123 ')).not.toBeNull();
    expect(await repo.findByNit(tenant, 'other')).toBeNull();
  });

  it('sorts by name or creation date', async () => {
    await repo.save(newSupplier('Zeta', 'NIT-1'));
    await repo.save(newSupplier('Alpha', 'NIT-2'));

    const tenant = TenantId.createFromString(tenantId);
    expect(
      (await repo.findByTenantId(tenant, { sortBy: 'name', sortOrder: 'asc' })).map(
        (supplier) => supplier.getName(),
      ),
    ).toEqual(['Alpha', 'Zeta']);

    expect((await repo.findByTenantId(tenant)).length).toBe(2);
  });

  it('soft-deletes and frees the NIT for a new supplier', async () => {
    const id = await repo.save(newSupplier());
    await repo.delete(SupplierId.create(id));

    const tenant = TenantId.createFromString(tenantId);
    expect(await repo.findById(SupplierId.create(id))).toBeNull();
    expect(await repo.findByNit(tenant, 'NIT-900123')).toBeNull();
    expect(await repo.findByTenantId(tenant)).toEqual([]);

    // the unique index is partial, so the same NIT can be registered again
    await expect(repo.save(newSupplier())).resolves.toBeDefined();
  });

  it('rolls back with the surrounding transaction', async () => {
    const manager = new PrismaTransactionManager(prisma);

    await expect(
      manager.executeInTransaction(async (context) => {
        await repo.save(newSupplier(), context.getContext());
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await prisma.suppliers.count()).toBe(0);
  });
});
