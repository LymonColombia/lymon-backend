import { GetInventoryItemCategoriesQueryHandler } from '@/application/inventory/queries/get-inventory-item-categories/get-inventory-item-categories.query-handler';
import { GetInventoryItemCategoriesQuery } from '@/application/inventory/queries/get-inventory-item-categories/get-inventory-item-categories.query';
import { GetInventoryItemCategoriesResult } from '@/application/inventory/queries/get-inventory-item-categories/get-inventory-item-categories.result';
import { InventoryItemCategoryRepository } from '@/domain/inventory/repositories/inventory-item-category.repository';
import { createInventoryItemCategoryRepositoryMock } from '@test/shared/mocks/repositories/inventory-item-category-repository.mock';
import {
  makeInventoryItemCategory,
  INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/inventory-item-category.fixture';

const TENANT_ID = INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS.tenantId;

function makeQuery(
  overrides?: Partial<{
    page: number;
    limit: number;
    search: string;
  }>,
): GetInventoryItemCategoriesQuery {
  return new GetInventoryItemCategoriesQuery(
    TENANT_ID,
    overrides?.page ?? 1,
    overrides?.limit ?? 10,
    overrides?.search,
  );
}

describe('GetInventoryItemCategoriesQueryHandler', () => {
  let handler: GetInventoryItemCategoriesQueryHandler;
  let categoryRepository: jest.Mocked<InventoryItemCategoryRepository>;

  beforeEach(() => {
    categoryRepository = createInventoryItemCategoryRepositoryMock();
    handler = new GetInventoryItemCategoriesQueryHandler(categoryRepository);
  });

  describe('when tenant has categories', () => {
    const categoryA = makeInventoryItemCategory({ name: 'Limpieza' });
    const categoryB = makeInventoryItemCategory({
      id: '7750a1b2-c3d4-e5f6-a7b8-c9d100000000',
      name: 'Ropa de cama',
    });

    beforeEach(() => {
      categoryRepository.findByTenantId.mockResolvedValue([
        categoryA,
        categoryB,
      ]);
    });

    it('returns a GetInventoryItemCategoriesResult', async () => {
      const result = await handler.execute(makeQuery());

      expect(result).toBeInstanceOf(GetInventoryItemCategoriesResult);
    });

    it('returns all categories for the tenant', async () => {
      const result = await handler.execute(makeQuery());

      expect(result.total).toBe(2);
      expect(result.categories).toHaveLength(2);
    });

    it('maps category fields to DTO', async () => {
      const result = await handler.execute(makeQuery());

      const dto = result.categories.find((c) => c.name === 'Limpieza');
      expect(dto).toBeDefined();
      expect(dto?.id).toBe(INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS.id);
      expect(dto?.description).toBe(
        INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS.description,
      );
    });

    it('filters by search term', async () => {
      const result = await handler.execute(makeQuery({ search: 'ropa' }));

      expect(result.total).toBe(1);
      expect(result.categories[0].name).toBe('Ropa de cama');
    });

    it('returns empty list when search matches nothing', async () => {
      const result = await handler.execute(makeQuery({ search: 'xyz' }));

      expect(result.total).toBe(0);
      expect(result.categories).toHaveLength(0);
    });

    it('paginates results', async () => {
      const result = await handler.execute(makeQuery({ page: 1, limit: 1 }));

      expect(result.categories).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('returns second page', async () => {
      const result = await handler.execute(makeQuery({ page: 2, limit: 1 }));

      expect(result.categories).toHaveLength(1);
    });
  });

  describe('when tenant has no categories', () => {
    beforeEach(() => {
      categoryRepository.findByTenantId.mockResolvedValue([]);
    });

    it('returns empty result', async () => {
      const result = await handler.execute(makeQuery());

      expect(result.total).toBe(0);
      expect(result.categories).toHaveLength(0);
    });
  });
});
