import { ForbiddenException } from '@nestjs/common';
import { CreateCustomCatalogItemHandler } from '@/application/guest-preference/commands/create-custom-catalog-item/create-custom-catalog-item.handler';
import { CreateCustomCatalogItemCommand } from '@/application/guest-preference/commands/create-custom-catalog-item/create-custom-catalog-item.command';
import { GuestPreferenceCatalogRepository } from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { GuestPreferenceSourceEnum } from '@/domain/guest-preference/entities/guest-preference-catalog-item.entity';
import { PlanTypeEnum } from '@/domain/tenant/value-objects/plan-type.vo';
import { createGuestPreferenceCatalogRepositoryMock } from '@test/shared/mocks/repositories/guest-preference-catalog-repository.mock';

const TENANT_ID = 'tenant-plan-test-456';
const ITEM_ID = 'new-catalog-item-id';

function makeCommand(
  activePlan: string,
  overrides: Partial<{
    label: string;
    category: GuestPreferenceCategoryEnum;
  }> = {},
): CreateCustomCatalogItemCommand {
  return new CreateCustomCatalogItemCommand(
    TENANT_ID,
    activePlan,
    overrides.category ?? GuestPreferenceCategoryEnum.ROOM,
    overrides.label ?? 'Habitación silenciosa',
    'actor-id',
    'actor@test.com',
  );
}

describe('CreateCustomCatalogItemHandler', () => {
  let handler: CreateCustomCatalogItemHandler;
  let repository: jest.Mocked<GuestPreferenceCatalogRepository>;

  let mockEventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    repository = createGuestPreferenceCatalogRepositoryMock();
    mockEventEmitter = { emit: jest.fn() };
    handler = new CreateCustomCatalogItemHandler(repository, mockEventEmitter as any);
  });

  // ── Scenario 2: Plan Gate ──────────────────────────────────────────────────

  describe('Scenario 2 — Plan Gate: access control by subscription plan', () => {
    describe('restricted plans — throws ForbiddenException without saving', () => {
      it.each([PlanTypeEnum.LYMON_ONE, PlanTypeEnum.TRIAL])(
        'rejects plan %s with ForbiddenException',
        async (plan) => {
          await expect(handler.execute(makeCommand(plan))).rejects.toThrow(
            ForbiddenException,
          );
          await expect(handler.execute(makeCommand(plan))).rejects.toThrow(
            'LYMON_PLUS or LYMON_PRIME plan',
          );
          expect(repository.save).not.toHaveBeenCalled();
        },
      );
    });

    describe('allowed plans — creates and persists the item', () => {
      it.each([PlanTypeEnum.LYMON_PLUS, PlanTypeEnum.LYMON_PRIME])(
        'allows plan %s to create a custom catalog item',
        async (plan) => {
          repository.save.mockResolvedValue(ITEM_ID);

          const result = await handler.execute(
            makeCommand(plan, {
              label: 'Piso alto',
              category: GuestPreferenceCategoryEnum.ROOM,
            }),
          );

          expect(result).toBe(ITEM_ID);
          expect(repository.save).toHaveBeenCalledTimes(1);

          const savedItem = repository.save.mock.calls[0][0];
          expect(savedItem.getLabel()).toBe('Piso alto');
          expect(savedItem.getCategory()).toBe(
            GuestPreferenceCategoryEnum.ROOM,
          );
          expect(savedItem.getSource()).toBe(GuestPreferenceSourceEnum.CUSTOM);
          expect(savedItem.getTenantId().toString()).toBe(TENANT_ID);
          expect(savedItem.getIsActive()).toBe(true);
        },
      );
    });
  });
});
