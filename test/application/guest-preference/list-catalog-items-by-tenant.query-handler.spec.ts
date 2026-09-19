import { ListCatalogItemsByTenantQueryHandler } from '@/application/guest-preference/queries/list-catalog-items-by-tenant/list-catalog-items-by-tenant.query-handler';
import { ListCatalogItemsByTenantQuery } from '@/application/guest-preference/queries/list-catalog-items-by-tenant/list-catalog-items-by-tenant.query';
import { ListCatalogItemsByTenantResult } from '@/application/guest-preference/queries/list-catalog-items-by-tenant/list-catalog-items-by-tenant.result';
import { GuestPreferenceCatalogRepository } from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';
import {
  GuestPreferenceCatalogItem,
  GuestPreferenceSourceEnum,
} from '@/domain/guest-preference/entities/guest-preference-catalog-item.entity';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { createGuestPreferenceCatalogRepositoryMock } from '@test/shared/mocks/repositories/guest-preference-catalog-repository.mock';

const TENANT_ID = 'tenant-abc-123';

function makeCatalogItem(
  id: string,
  label: string,
  isActive: boolean,
): GuestPreferenceCatalogItem {
  return GuestPreferenceCatalogItem.reconstitute({
    id,
    tenantId: TenantId.createFromString(TENANT_ID),
    category: GuestPreferenceCategoryEnum.ROOM,
    source: GuestPreferenceSourceEnum.CUSTOM,
    key: null,
    label,
    isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ListCatalogItemsByTenantQueryHandler', () => {
  let handler: ListCatalogItemsByTenantQueryHandler;
  let repository: jest.Mocked<GuestPreferenceCatalogRepository>;

  const query = new ListCatalogItemsByTenantQuery(TENANT_ID);
  const queryIncludeInactive = new ListCatalogItemsByTenantQuery(
    TENANT_ID,
    true,
  );

  beforeEach(() => {
    repository = createGuestPreferenceCatalogRepositoryMock();
    handler = new ListCatalogItemsByTenantQueryHandler(repository);
  });

  // ── Scenario 1: Visibility / Status ────────────────────────────────────────

  describe('Scenario 1 — Visibility / Status: active-item filtering', () => {
    it('returns only active items when the catalog contains both active and inactive entries', async () => {
      const activeItem = makeCatalogItem('item-active-1', 'Piso alto', true);
      const inactiveItem = makeCatalogItem(
        'item-inactive-1',
        'Opción obsoleta',
        false,
      );

      repository.findByTenant.mockResolvedValue([activeItem, inactiveItem]);

      const result = await handler.execute(query);

      expect(result).toBeInstanceOf(ListCatalogItemsByTenantResult);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('item-active-1');
      expect(result.items[0].isActive).toBe(true);
    });

    it('returns an empty array when all catalog items are inactive', async () => {
      const inactiveA = makeCatalogItem('item-inactive-a', 'Opción A', false);
      const inactiveB = makeCatalogItem('item-inactive-b', 'Opción B', false);

      repository.findByTenant.mockResolvedValue([inactiveA, inactiveB]);

      const result = await handler.execute(query);

      expect(result.items).toHaveLength(0);
    });

    it('returns all items when every catalog item is active', async () => {
      const items = [
        makeCatalogItem('item-1', 'Habitación silenciosa', true),
        makeCatalogItem('item-2', 'Piso alto', true),
        makeCatalogItem('item-3', 'Almohada extra', true),
      ];

      repository.findByTenant.mockResolvedValue(items);

      const result = await handler.execute(query);

      expect(result.items).toHaveLength(3);
      expect(result.items.every((i) => i.isActive)).toBe(true);
    });

    it('maps each active item to a DTO with all expected fields', async () => {
      const item = makeCatalogItem('item-dto-1', 'Piso alto', true);
      repository.findByTenant.mockResolvedValue([item]);

      const result = await handler.execute(query);

      const dto = result.items[0];
      expect(dto.id).toBe('item-dto-1');
      expect(dto.tenantId).toBe(TENANT_ID);
      expect(dto.label).toBe('Piso alto');
      expect(dto.category).toBe(GuestPreferenceCategoryEnum.ROOM);
      expect(dto.source).toBe(GuestPreferenceSourceEnum.CUSTOM);
      expect(dto.isActive).toBe(true);
    });
  });

  // ── Scenario 2: includeInactive flag ────────────────────────────────────────

  describe('Scenario 2 — includeInactive flag', () => {
    it('returns all items (active and inactive) when includeInactive=true', async () => {
      const activeItem = makeCatalogItem('item-active-1', 'Piso alto', true);
      const inactiveItem = makeCatalogItem(
        'item-inactive-1',
        'Opción obsoleta',
        false,
      );

      repository.findByTenant.mockResolvedValue([activeItem, inactiveItem]);

      const result = await handler.execute(queryIncludeInactive);

      expect(result.items).toHaveLength(2);
      expect(result.items.map((i) => i.id)).toContain('item-active-1');
      expect(result.items.map((i) => i.id)).toContain('item-inactive-1');
    });

    it('returns inactive items when includeInactive=true and all items are inactive', async () => {
      const inactiveA = makeCatalogItem('item-inactive-a', 'Opción A', false);
      const inactiveB = makeCatalogItem('item-inactive-b', 'Opción B', false);

      repository.findByTenant.mockResolvedValue([inactiveA, inactiveB]);

      const result = await handler.execute(queryIncludeInactive);

      expect(result.items).toHaveLength(2);
    });
  });
});
