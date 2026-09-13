import { GetSuppliersQueryHandler } from '@/application/inventory/queries/get-suppliers/get-suppliers.query-handler';
import { GetSuppliersQuery } from '@/application/inventory/queries/get-suppliers/get-suppliers.query';
import { SupplierRepository } from '@/domain/inventory/repositories/supplier.repository';
import { createSupplierRepositoryMock } from '@test/shared/mocks/repositories/supplier-repository.mock';
import { makeSupplier } from '@test/shared/fixtures/supplier.fixture';

describe('GetSuppliersQueryHandler', () => {
  let handler: GetSuppliersQueryHandler;
  let supplierRepository: jest.Mocked<SupplierRepository>;

  beforeEach(() => {
    supplierRepository = createSupplierRepositoryMock();
    handler = new GetSuppliersQueryHandler(supplierRepository);
  });

  it('returns paginated suppliers list', async () => {
    supplierRepository.findByTenantId.mockResolvedValue([
      makeSupplier({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bravo Supplies',
      }),
      makeSupplier({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Alpha Supplies',
      }),
    ]);

    const result = await handler.execute(
      new GetSuppliersQuery('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000', 1, 1),
    );

    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.suppliers).toHaveLength(1);
  });

  it('returns empty result when no suppliers exist', async () => {
    supplierRepository.findByTenantId.mockResolvedValue([]);

    const result = await handler.execute(
      new GetSuppliersQuery('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000', 1, 10),
    );

    expect(result.total).toBe(0);
    expect(result.suppliers).toEqual([]);
    expect(result.totalPages).toBe(0);
  });

  it('filters suppliers by search term', async () => {
    supplierRepository.findByTenantId.mockResolvedValue([
      makeSupplier({ name: 'Fresh Supplies Inc.' }),
      makeSupplier({ name: 'Hotel Linen Co.' }),
    ]);

    const result = await handler.execute(
      new GetSuppliersQuery('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000', 1, 10, 'fresh'),
    );

    expect(result.total).toBe(1);
    expect(result.suppliers[0].name).toBe('Fresh Supplies Inc.');
  });

  it('sorts suppliers by name ascending', async () => {
    supplierRepository.findByTenantId.mockResolvedValue([
      makeSupplier({ name: 'Zulu Traders' }),
      makeSupplier({ name: 'Alpha Partners' }),
    ]);

    const result = await handler.execute(
      new GetSuppliersQuery(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        1,
        10,
        undefined,
        'name',
        'asc',
      ),
    );

    expect(result.suppliers.map((supplier) => supplier.name)).toEqual([
      'Alpha Partners',
      'Zulu Traders',
    ]);
  });

  it('sorts suppliers by creation date descending', async () => {
    supplierRepository.findByTenantId.mockResolvedValue([
      makeSupplier({
        name: 'Older Supplier',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
      makeSupplier({
        name: 'Newer Supplier',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      }),
    ]);

    const result = await handler.execute(
      new GetSuppliersQuery(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        1,
        10,
        undefined,
        'createdAt',
        'desc',
      ),
    );

    expect(result.suppliers.map((supplier) => supplier.name)).toEqual([
      'Newer Supplier',
      'Older Supplier',
    ]);
  });

  it('defaults to page 1 and limit 10 when not provided', async () => {
    supplierRepository.findByTenantId.mockResolvedValue([
      makeSupplier({ name: 'Solo Supplier' }),
    ]);

    const result = await handler.execute(
      new GetSuppliersQuery('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
    );

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.suppliers).toHaveLength(1);
  });
});
