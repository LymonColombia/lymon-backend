import { ConflictException } from '@nestjs/common';
import { CreateInventoryItemCategoryHandler } from '@/application/inventory/commands/create-inventory-item-category/create-inventory-item-category.handler';
import { CreateInventoryItemCategoryCommand } from '@/application/inventory/commands/create-inventory-item-category/create-inventory-item-category.command';
import { CreateInventoryItemCategoryResult } from '@/application/inventory/commands/create-inventory-item-category/create-inventory-item-category.result';
import { InventoryItemCategoryRepository } from '@/domain/inventory/repositories/inventory-item-category.repository';
import { createInventoryItemCategoryRepositoryMock } from '@test/shared/mocks/repositories/inventory-item-category-repository.mock';
import {
  makeInventoryItemCategory,
  INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/inventory-item-category.fixture';

const TENANT_ID = INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS.tenantId;
const CATEGORY_ID = INVENTORY_ITEM_CATEGORY_FIXTURE_DEFAULTS.id;
const ACTOR_ID = 'actor-user-id';
const ACTOR_EMAIL = 'actor@example.com';

function makeCommand(
  overrides?: Partial<{
    name: string;
    description: string | null;
  }>,
): CreateInventoryItemCategoryCommand {
  const description =
    overrides && 'description' in overrides
      ? overrides.description!
      : 'Productos de limpieza';
  return new CreateInventoryItemCategoryCommand(
    TENANT_ID,
    overrides?.name ?? 'Limpieza',
    description,
    ACTOR_ID,
    ACTOR_EMAIL,
  );
}

describe('CreateInventoryItemCategoryHandler', () => {
  let handler: CreateInventoryItemCategoryHandler;
  let categoryRepository: jest.Mocked<InventoryItemCategoryRepository>;

  beforeEach(() => {
    categoryRepository = createInventoryItemCategoryRepositoryMock();
    handler = new CreateInventoryItemCategoryHandler(categoryRepository);
  });

  describe('when category name is unique', () => {
    beforeEach(() => {
      categoryRepository.findByName.mockResolvedValue(null);
      categoryRepository.save.mockResolvedValue(CATEGORY_ID);
    });

    it('returns a CreateInventoryItemCategoryResult', async () => {
      const result = await handler.execute(makeCommand());

      expect(result).toBeInstanceOf(CreateInventoryItemCategoryResult);
      expect(result.id).toBe(CATEGORY_ID);
      expect(result.name).toBe('Limpieza');
      expect(result.description).toBe('Productos de limpieza');
    });

    it('saves the category to the repository', async () => {
      await handler.execute(makeCommand());

      expect(categoryRepository.save).toHaveBeenCalledTimes(1);
    });

    it('checks for duplicate name before saving', async () => {
      await handler.execute(makeCommand());

      expect(categoryRepository.findByName).toHaveBeenCalledTimes(1);
    });

    it('returns null description when not provided', async () => {
      const result = await handler.execute(makeCommand({ description: null }));

      expect(result.description).toBeNull();
    });
  });

  describe('when category name already exists', () => {
    beforeEach(() => {
      categoryRepository.findByName.mockResolvedValue(
        makeInventoryItemCategory(),
      );
    });

    it('throws ConflictException', async () => {
      await expect(handler.execute(makeCommand())).rejects.toThrow(
        ConflictException,
      );
    });

    it('does not save the category', async () => {
      await expect(handler.execute(makeCommand())).rejects.toThrow();

      expect(categoryRepository.save).not.toHaveBeenCalled();
    });
  });
});
